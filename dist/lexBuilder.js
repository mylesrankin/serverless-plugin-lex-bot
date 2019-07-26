"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require("aws-sdk");
const JSZip = require("jszip");
const requestPromise = require("request-promise-native");
const yamljs = require("js-yaml");
class LexBuilder {
    constructor(provider) {
        this.provider = provider;
        const credentials = provider.getCredentials();
        this.region = credentials.region;
        this.builder = new AWS.LexModelBuildingService({
            apiVersion: "2017-04-19",
            region: credentials.region,
            credentials: credentials.credentials
        });
    }
    exportModel(botName, botVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const exportRes = yield this.builder
                    .getExport({
                    name: botName,
                    version: botVersion.toString(),
                    exportType: "LEX",
                    resourceType: "BOT"
                })
                    .promise();
                const url = exportRes.url;
                const response = yield requestPromise({
                    uri: url,
                    method: "GET",
                    resolveWithFullResponse: true,
                    encoding: null
                });
                const zip = new JSZip();
                const contents = yield zip.loadAsync(response.body);
                const file = contents.files[botName + "_Export.json"];
                const json = yield file.async("text");
                const model = JSON.parse(json);
                // console.log(JSON.stringify(model, null, 2));
                const yaml = yamljs.dump(model);
                // console.log(yaml);
            }
            catch (err) {
                console.log(err);
            }
        });
    }
    deduplicate(alexaModel) {
        const dup = {};
        for (var i of alexaModel.intents) {
            const dedupe = [];
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
    importModel(alexaModel, botName, skillID) {
        return __awaiter(this, void 0, void 0, function* () {
            const arns = [];
            const skill = alexaModel.skills.find((s) => s.id == skillID);
            if (!skill) {
                throw new Error(skillID + " Alexa skill id not found");
            }
            const version = 0;
            try {
                const accountId = yield this.provider.getAccountId();
                for (var locale in skill.models) {
                    const lang = skill.models[locale];
                    const longName = botName + "_" + locale.replace("-", "_").toLowerCase();
                    const langModel = lang.interactionModel.languageModel;
                    const lexBot = this.convertLangToLex(this.deduplicate(langModel), locale, longName, version);
                    //console.log(JSON.stringify(lexBot, null, 2));
                    const json = JSON.stringify(lexBot);
                    const zipjs = new JSZip();
                    zipjs.file(longName, json);
                    const zip = yield zipjs.generateAsync({ type: "arraybuffer" });
                    const req = {
                        resourceType: "BOT",
                        mergeStrategy: "OVERWRITE_LATEST",
                        payload: zip
                    };
                    //console.log("Lex-Import");
                    const resp = yield this.builder
                        .startImport(req)
                        .promise();
                    var status = resp.importStatus;
                    var importDone = resp;
                    if (!resp.importId) {
                        throw new Error(JSON.stringify(resp, null, 2));
                    }
                    //console.log("Lex-InProgress:"+JSON.stringify(resp, null, 2));
                    while (status == "IN_PROGRESS") {
                        try {
                            yield new Promise((resolve) => setTimeout(resolve, 1500));
                            importDone = yield this.builder
                                .getImport({
                                importId: resp.importId
                            })
                                .promise();
                            //console.log("Lex-InProgress:"+JSON.stringify(importDone, null, 2));
                            status = importDone.importStatus;
                        }
                        catch (err) {
                            if (err.code != "LimitExceededException") {
                                throw err;
                            }
                            status = "IN_PROGRESS";
                        }
                    }
                    if (importDone.importStatus !== "COMPLETE") {
                        throw new Error(JSON.stringify(importDone, null, 2));
                    }
                    //console.log("Lex-GetBot");
                    var bot = yield this.builder
                        .getBot({
                        name: longName,
                        versionOrAlias: "$LATEST"
                    })
                        .promise();
                    //console.log(JSON.stringify(bot, null, 2))
                    const putRequest = {
                        name: longName,
                        locale: locale,
                        description: bot.description,
                        intents: bot.intents,
                        voiceId: bot.voiceId,
                        idleSessionTTLInSeconds: bot.idleSessionTTLInSeconds,
                        clarificationPrompt: bot.clarificationPrompt,
                        abortStatement: bot.abortStatement,
                        childDirected: bot.childDirected,
                        checksum: bot.checksum,
                        createVersion: false,
                        processBehavior: "BUILD"
                    };
                    //console.log("Lex-PutBot");
                    const putResponse = yield this.builder
                        .putBot(putRequest)
                        .promise();
                    //console.log(JSON.stringify(putResponse, null, 2));
                    var status = putResponse.status;
                    //console.log("Lex-Building");
                    while (status == "BUILDING") {
                        try {
                            yield new Promise((resolve) => setTimeout(resolve, 6000));
                            bot = yield this.builder
                                .getBot({
                                name: longName,
                                versionOrAlias: "$LATEST"
                            })
                                .promise();
                            status = bot.status;
                        }
                        catch (err) {
                            if (err.code != "LimitExceededException") {
                                throw err;
                            }
                            status = "BUILDING";
                        }
                    }
                    if (bot.status != "READY") {
                        throw new Error(JSON.stringify(bot, null, 2));
                    }
                    const versionAlias = "latest";
                    const aliasReq = {
                        name: versionAlias,
                        botVersion: "$LATEST",
                        botName: longName,
                        checksum: undefined
                    };
                    try {
                        //console.log("Lex-getAlias");
                        const alias = yield this.builder
                            .getBotAlias({
                            botName: longName,
                            name: versionAlias
                        })
                            .promise();
                        aliasReq.checksum = alias.checksum;
                    }
                    catch (err) { }
                    //console.log("Lex-putAlias");
                    const aliasResponse = yield this.builder
                        .putBotAlias(aliasReq)
                        .promise();
                    const arn = "arn:aws:lex:" +
                        this.region +
                        ":" +
                        accountId +
                        ":bot:" +
                        aliasResponse.botName +
                        ":" +
                        aliasResponse.name;
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
        });
    }
    convertTypeToLex(alexaType, longName, version) {
        return {
            name: longName + "_" + alexaType.name,
            version: version,
            enumerationValues: alexaType.values.map((v) => {
                if (alexaType.strategy == "TOP_RESOLUTION") {
                    // console.log("Top Resolution");
                    return {
                        value: v.name.value,
                        synonyms: v.name.synonyms
                    };
                }
                else {
                    // console.log("Original Value");
                    // console.log("->" + v);
                    return {
                        value: v
                    };
                }
            }),
            valueSelectionStrategy: alexaType.strategy
        };
    }
    convertSlotToLex(alexaSlot, longName, version) {
        return Object.assign({ name: longName + "_" + alexaSlot.name }, (alexaSlot.type.includes("AMAZON")
            ? {}
            : { slotTypeVersion: version }), { sampleUtterances: alexaSlot.samples
                ? alexaSlot.samples.map((s) => s.replace(/{(.+)}/, "{" + longName + "_$1}"))
                : [], slotType: alexaSlot.type.includes("AMAZON")
                ? alexaSlot.type
                : longName + "_" + alexaSlot.type, slotConstraint: "Required", priority: 1, valueElicitationPrompt: {
                messages: [
                    {
                        contentType: "PlainText",
                        content: "n/a"
                    }
                ],
                maxAttempts: 1
            } });
    }
    convertIntentToLexBuiltin(alexaIntent, longName, version) {
        return {
            name: longName + "_" + alexaIntent.name.replace("AMAZON.", "BMAZON_"),
            version: version,
            fulfillmentActivity: {
                type: "ReturnIntent"
            },
            parentIntentSignature: alexaIntent.name
        };
    }
    convertIntentToLex(alexaIntent, longName, version) {
        return {
            name: longName + "_" + alexaIntent.name.replace(".", "_"),
            version: version,
            fulfillmentActivity: {
                type: "ReturnIntent"
            },
            sampleUtterances: alexaIntent.samples
                ? alexaIntent.samples.map((s) => s.replace(/\{(.+?)\}/g, "{" + longName + "_$1}"))
                : [],
            slots: alexaIntent.slots
                ? alexaIntent.slots.map((s) => this.convertSlotToLex(s, longName, version))
                : []
        };
    }
    convertLangToLex(alexaModel, locale, longName, version) {
        const filtered = alexaModel.intents.filter((i) => i.name != "AMAZON.FallbackIntent" &&
            i.name != "AMAZON.ScrollUpIntent" &&
            i.name != "AMAZON.ScrollLeftIntent" &&
            i.name != "AMAZON.ScrollDownIntent" &&
            i.name != "AMAZON.ScrollRightIntent" &&
            i.name != "AMAZON.PageDownIntent" &&
            i.name != "AMAZON.PageUpIntent" &&
            i.name != "AMAZON.MoreIntent" &&
            i.name != "AMAZON.NavigateHomeIntent" &&
            i.name != "AMAZON.NavigateSettingsIntent");
        const intents = filtered.map((i) => this.convertIntentToLex(i, longName, version));
        const intentsBuiltIn = filtered
            .filter((i) => i.name.indexOf("AMAZON.") == 0 &&
            i.name != "AMAZON.YesIntent" &&
            i.name != "AMAZON.NoIntent")
            .map((i) => this.convertIntentToLexBuiltin(i, longName, version));
        return {
            metadata: {
                schemaVersion: "1.0",
                importType: "LEX",
                importFormat: "JSON"
            },
            resource: {
                name: longName,
                version: version,
                intents: [...intents, ...intentsBuiltIn],
                slotTypes: alexaModel.types.map((t) => {
                    console.log(t);
                    return this.convertTypeToLex(t, longName, version);
                }),
                childDirected: false,
                voiceId: "0",
                idleSessionTTLInSeconds: 300,
                locale: locale,
                clarificationPrompt: {
                    messages: [
                        {
                            contentType: "PlainText",
                            content: "n/a"
                        }
                    ],
                    maxAttempts: 1
                },
                abortStatement: {
                    messages: [
                        {
                            contentType: "PlainText",
                            content: "n/a"
                        }
                    ]
                }
            }
        };
    }
}
exports.LexBuilder = LexBuilder;
//# sourceMappingURL=lexBuilder.js.map