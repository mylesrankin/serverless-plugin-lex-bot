import * as AWS from 'aws-sdk';
import { ServerlessProvider } from './sls';
import * as JSZip from 'jszip';
import * as requestPromise from "request-promise-native";
import * as yamljs from 'js-yaml'
import { SlsAlexa, SlsAlexaLanguage, SlsAlexaType, SlsAlexaIntent, SlsAlexaSlot, SlsAlexaModel } from './alexa';

export class LexBuilder {
    private builder: AWS.LexModelBuildingService;
    private region: string;
    constructor(
        private provider: ServerlessProvider
    ) {
        const credentials = provider.getCredentials()
        this.region = credentials.region
        this.builder = new AWS.LexModelBuildingService({
            apiVersion: '2017-04-19',
            region: credentials.region,
            credentials: credentials.credentials,
        });
    }

    async exportModel(botName: string, botVersion: number) {
        try {
            const exportRes: AWS.LexModelBuildingService.Types.GetExportResponse = await this.builder.getExport({
                name: botName,
                version: botVersion.toString(),
                exportType: "LEX",
                resourceType: "BOT"

            }).promise();

            const url: string = exportRes.url!;
            const response = await requestPromise({
                uri: url,
                method: "GET",
                resolveWithFullResponse: true,
                encoding: null
            });
            const zip = new JSZip();
            const contents = await zip.loadAsync(response.body);
            const file = contents.files[botName + '_Export.json'];
            const json = await file.async('text');
            const model = JSON.parse(json);
            // console.log(JSON.stringify(model, null, 2));
            const yaml = yamljs.dump(model);
            // console.log(yaml);
        }
        catch (err) {
            console.log(err);
        }
    }

    deduplicate(alexaModel: SlsAlexaModel): SlsAlexaModel {
        const dup: { [k: string]: number } = {}

        for (var i of alexaModel.intents) {
            const dedupe: string[] = []
            for (var u of i.samples) {
                if (dup[u]) {
                    console.log('Lex: duplicate sample uterrance:"' + u + '"');
                }
                else {
                    dedupe.push(u);
                    dup[u] = 1;
                }
            }
            i.samples = dedupe;
        }
        return alexaModel;
    }

    async importModel(alexaModel: SlsAlexa, botName: string, skillID: string): Promise<string[]> {
        const arns: string[] = [];
        const skill = alexaModel.skills.find(s => s.id == skillID);
        if (!skill) {
            throw new Error(skillID + " aleda skill id not found");
        }

        const version = 0;
        try {
            const accountId = await this.provider.getAccountId();
            for (var locale in skill.models) {
                const lang = skill.models[locale];
                const longName = botName + '_' + locale.replace('-', '_');
                const langModel = lang.interactionModel.languageModel;
                const lexBot = this.convertLangToLex(this.deduplicate(langModel), locale, longName, version);
                //console.log(JSON.stringify(lexBot, null, 2));
                const json = JSON.stringify(lexBot);
                const zipjs = new JSZip();
                zipjs.file(longName, json);
                const zip = await zipjs.generateAsync({ type: "arraybuffer" })
                const req: AWS.LexModelBuildingService.Types.StartImportRequest = {
                    resourceType: "BOT",
                    mergeStrategy: "OVERWRITE_LATEST",
                    payload: zip,
                }
                //console.log("Lex-Import");
                const resp: AWS.LexModelBuildingService.Types.StartImportResponse = await this.builder.startImport(req).promise();
                var status = resp.importStatus;
                var importDone = resp;
                if (!resp.importId) {
                    throw new Error(JSON.stringify(resp, null, 2))
                }
                //console.log("Lex-InProgress");
                while (status == 'IN_PROGRESS') {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 500));

                        importDone = await this.builder.getImport({
                            importId: resp.importId,
                        }).promise();
                        status = importDone.importStatus;
                    }
                    catch (err) {
                        if (err.code != "LimitExceededException") {
                            throw err;
                        }
                    }
                }
                if (importDone.importStatus !== 'COMPLETE') {
                    throw new Error(JSON.stringify(resp, null, 2))
                }
                //console.log("Lex-GetBot");
                var bot = await this.builder.getBot({
                    name: longName,
                    versionOrAlias: "$LATEST"
                }).promise();
                //console.log(JSON.stringify(bot, null, 2))

                const putRequest: AWS.LexModelBuildingService.Types.PutBotRequest = {
                    "name": longName,
                    "locale": locale,
                    "description": bot.description,
                    "intents": bot.intents,
                    "voiceId": bot.voiceId,
                    "idleSessionTTLInSeconds": bot.idleSessionTTLInSeconds,
                    "clarificationPrompt": bot.clarificationPrompt,
                    "abortStatement": bot.abortStatement,
                    "childDirected": bot.childDirected!,
                    checksum: bot.checksum,
                    createVersion: false,
                    processBehavior: "BUILD"
                }
                //console.log("Lex-PutBot");
                const putResponse: AWS.LexModelBuildingService.Types.PutBotResponse = await this.builder.putBot(putRequest).promise();
                //console.log(JSON.stringify(putResponse, null, 2));
                var status = putResponse.status;
                //console.log("Lex-Building");
                while (status == "BUILDING") {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        bot = await this.builder.getBot({
                            name: longName,
                            versionOrAlias: "$LATEST"
                        }).promise();
                        status = bot.status;
                    }
                    catch (err) {
                        if (err.code != "LimitExceededException") {
                            throw err;
                        }
                    }

                }
                if (bot.status != "READY") {
                    throw new Error(JSON.stringify(bot, null, 2))
                }
                const versionAlias = "latest";
                const aliasReq = {
                    name: versionAlias,
                    botVersion: "$LATEST",
                    botName: longName,
                    checksum: <string><unknown>undefined
                };
                try {
                    //console.log("Lex-getAlias");
                    const alias = await this.builder.getBotAlias({
                        botName: longName,
                        name: versionAlias
                    }).promise();
                    aliasReq.checksum = alias.checksum!;
                }
                catch (err) {
                }
                //console.log("Lex-putAlias");
                const aliasResponse = await this.builder.putBotAlias(aliasReq).promise();

                const arn = "arn:aws:lex:" + this.region + ":" + accountId + ":bot:" + aliasResponse.botName + ":" + aliasResponse.name;
                console.log("Lex:" + arn);
                //console.log(JSON.stringify(aliasResponse, null, 2));
                arns.push(arn);
            }
            return arns;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }

    convertTypeToLex(alexaType: SlsAlexaType, longName: string, version: number): any {
        return {
            "name": longName + '_' + alexaType.name,
            "version": version,
            "enumerationValues": alexaType.values.map(v => {
                return {
                    "value": v.name.value,
                    "synonyms": v.name.synonyms
                }
            }),
            "valueSelectionStrategy": "TOP_RESOLUTION"
        }
    }

    convertSlotToLex(alexaSlot: SlsAlexaSlot, longName: string, version: number) {
        return {
            "name": longName + '_' + alexaSlot.name,
            "slotTypeVersion": version,
            "sampleUtterances": alexaSlot.samples
                ? alexaSlot.samples.map(s => s.replace(/{(.+)}/, "{" + longName + "_$1}"))
                : [],
            "slotType": longName + '_' + alexaSlot.type,
            "slotConstraint": "Required",
            "priority": 1,
            "valueElicitationPrompt": {
                "messages": [
                    {
                        "contentType": "PlainText",
                        "content": "n/a"
                    }
                ],
                "maxAttempts": 1
            },
        };
    }

    convertIntentToLex(alexaIntent: SlsAlexaIntent, longName: string, version: number) {
        if (alexaIntent.name.indexOf('AMAZON') != -1
        && alexaIntent.name.indexOf('AMAZON.YesIntent') == -1
        && alexaIntent.name.indexOf('AMAZON.NoIntent') == -1
        ) {
            return {
                "name": longName + '_' + alexaIntent.name.replace('.', "_"),
                "version": version,
                "fulfillmentActivity": {
                    "type": "ReturnIntent"
                },
                "parentIntentSignature": alexaIntent.name
            }
        }

        return {
            "name": longName + '_' + alexaIntent.name.replace('.', "_"),
            "version": version,
            "fulfillmentActivity": {
                "type": "ReturnIntent"
            },
            "sampleUtterances": alexaIntent.samples
                ? alexaIntent.samples.map(s => s.replace(/{(.+)}/, "{" + longName + "_$1}"))
                : [],

            "slots": alexaIntent.slots
                ? alexaIntent.slots.map(s => this.convertSlotToLex(s, longName, version))
                : []
        };
    }

    convertLangToLex(alexaModel: SlsAlexaModel, locale: string, longName: string, version: number): any {
        return {
            "metadata": {
                "schemaVersion": "1.0",
                "importType": "LEX",
                "importFormat": "JSON"
            },
            "resource": {
                "name": longName,
                "version": version,
                "intents": alexaModel.intents
                    .filter(i => i.name != "AMAZON.FallbackIntent"
                        && i.name != "AMAZON.ScrollUpIntent"
                        && i.name != "AMAZON.ScrollLeftIntent"
                        && i.name != "AMAZON.ScrollDownIntent"
                        && i.name != "AMAZON.ScrollRightIntent"
                        && i.name != "AMAZON.PageDownIntent"
                        && i.name != "AMAZON.PageUpIntent"
                        && i.name != "AMAZON.MoreIntent"
                        && i.name != "AMAZON.NavigateHomeIntent"
                        && i.name != "AMAZON.NavigateSettingsIntent"
                    )
                    .map(i => this.convertIntentToLex(i, longName, version)),
                "slotTypes": alexaModel.types.map(t => this.convertTypeToLex(t, longName, version)),
                "childDirected": false,
                "voiceId": "0",
                "idleSessionTTLInSeconds": 300,
                "locale": locale,
                "clarificationPrompt": {
                    "messages": [
                        {
                            "contentType": "PlainText",
                            "content": "n/a"
                        },
                    ],
                    "maxAttempts": 1
                },
                "abortStatement": {
                    messages: [
                        {
                            "contentType": "PlainText",
                            "content": "n/a"
                        }
                    ]
                },
            }
        };
    }
}

