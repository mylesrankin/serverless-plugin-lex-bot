"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var AWS = require("aws-sdk");
var JSZip = require("jszip");
var requestPromise = require("request-promise-native");
var yamljs = require("js-yaml");
var LexBuilder = /** @class */ (function () {
    function LexBuilder(provider) {
        this.provider = provider;
        var credentials = provider.getCredentials();
        this.region = credentials.region;
        this.builder = new AWS.LexModelBuildingService({
            apiVersion: "2017-04-19",
            region: credentials.region,
            credentials: credentials.credentials
        });
    }
    LexBuilder.prototype.exportModel = function (botName, botVersion) {
        return __awaiter(this, void 0, void 0, function () {
            var exportRes, url, response, zip, contents, file, json, model, yaml, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.builder
                                .getExport({
                                name: botName,
                                version: botVersion.toString(),
                                exportType: "LEX",
                                resourceType: "BOT"
                            })
                                .promise()];
                    case 1:
                        exportRes = _a.sent();
                        url = exportRes.url;
                        return [4 /*yield*/, requestPromise({
                                uri: url,
                                method: "GET",
                                resolveWithFullResponse: true,
                                encoding: null
                            })];
                    case 2:
                        response = _a.sent();
                        zip = new JSZip();
                        return [4 /*yield*/, zip.loadAsync(response.body)];
                    case 3:
                        contents = _a.sent();
                        file = contents.files[botName + "_Export.json"];
                        return [4 /*yield*/, file.async("text")];
                    case 4:
                        json = _a.sent();
                        model = JSON.parse(json);
                        yaml = yamljs.dump(model);
                        return [3 /*break*/, 6];
                    case 5:
                        err_1 = _a.sent();
                        console.log(err_1);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    LexBuilder.prototype.deduplicate = function (alexaModel) {
        var dup = {};
        for (var _i = 0, _a = alexaModel.intents; _i < _a.length; _i++) {
            var i = _a[_i];
            var dedupe = [];
            for (var _b = 0, _c = i.samples; _b < _c.length; _b++) {
                var u = _c[_b];
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
    };
    LexBuilder.prototype.importModel = function (alexaModel, botName, skillID) {
        return __awaiter(this, void 0, void 0, function () {
            var arns, skill, version, accountId, _a, _b, _i, locale, lang, longName, langModel, lexBot, json, zipjs, zip, req, resp, status, importDone, err_2, bot, putRequest, putResponse, status, err_3, versionAlias, aliasReq, alias, err_4, aliasResponse, arn, err_5;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        arns = [];
                        skill = alexaModel.skills.find(function (s) { return s.id == skillID; });
                        if (!skill) {
                            throw new Error(skillID + " Alexa skill id not found");
                        }
                        version = 0;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 29, , 30]);
                        return [4 /*yield*/, this.provider.getAccountId()];
                    case 2:
                        accountId = _c.sent();
                        _a = [];
                        for (_b in skill.models)
                            _a.push(_b);
                        _i = 0;
                        _c.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 28];
                        locale = _a[_i];
                        lang = skill.models[locale];
                        longName = botName + "_" + locale.replace("-", "_").toLowerCase();
                        langModel = lang.interactionModel.languageModel;
                        lexBot = this.convertLangToLex(this.deduplicate(langModel), locale, longName, version);
                        json = JSON.stringify(lexBot);
                        zipjs = new JSZip();
                        zipjs.file(longName, json);
                        return [4 /*yield*/, zipjs.generateAsync({ type: "arraybuffer" })];
                    case 4:
                        zip = _c.sent();
                        req = {
                            resourceType: "BOT",
                            mergeStrategy: "OVERWRITE_LATEST",
                            payload: zip
                        };
                        return [4 /*yield*/, this.builder
                                .startImport(req)
                                .promise()];
                    case 5:
                        resp = _c.sent();
                        status = resp.importStatus;
                        importDone = resp;
                        if (!resp.importId) {
                            throw new Error(JSON.stringify(resp, null, 2));
                        }
                        _c.label = 6;
                    case 6:
                        if (!(status == "IN_PROGRESS")) return [3 /*break*/, 12];
                        _c.label = 7;
                    case 7:
                        _c.trys.push([7, 10, , 11]);
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1500); })];
                    case 8:
                        _c.sent();
                        return [4 /*yield*/, this.builder
                                .getImport({
                                importId: resp.importId
                            })
                                .promise()];
                    case 9:
                        importDone = _c.sent();
                        //console.log("Lex-InProgress:"+JSON.stringify(importDone, null, 2));
                        status = importDone.importStatus;
                        return [3 /*break*/, 11];
                    case 10:
                        err_2 = _c.sent();
                        if (err_2.code != "LimitExceededException") {
                            throw err_2;
                        }
                        status = "IN_PROGRESS";
                        return [3 /*break*/, 11];
                    case 11: return [3 /*break*/, 6];
                    case 12:
                        if (importDone.importStatus !== "COMPLETE") {
                            throw new Error(JSON.stringify(importDone, null, 2));
                        }
                        return [4 /*yield*/, this.builder
                                .getBot({
                                name: longName,
                                versionOrAlias: "$LATEST"
                            })
                                .promise()];
                    case 13:
                        bot = _c.sent();
                        putRequest = {
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
                        return [4 /*yield*/, this.builder
                                .putBot(putRequest)
                                .promise()];
                    case 14:
                        putResponse = _c.sent();
                        status = putResponse.status;
                        _c.label = 15;
                    case 15:
                        if (!(status == "BUILDING")) return [3 /*break*/, 21];
                        _c.label = 16;
                    case 16:
                        _c.trys.push([16, 19, , 20]);
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 6000); })];
                    case 17:
                        _c.sent();
                        return [4 /*yield*/, this.builder
                                .getBot({
                                name: longName,
                                versionOrAlias: "$LATEST"
                            })
                                .promise()];
                    case 18:
                        bot = _c.sent();
                        status = bot.status;
                        return [3 /*break*/, 20];
                    case 19:
                        err_3 = _c.sent();
                        if (err_3.code != "LimitExceededException") {
                            throw err_3;
                        }
                        status = "BUILDING";
                        return [3 /*break*/, 20];
                    case 20: return [3 /*break*/, 15];
                    case 21:
                        if (bot.status != "READY") {
                            throw new Error(JSON.stringify(bot, null, 2));
                        }
                        versionAlias = "latest";
                        aliasReq = {
                            name: versionAlias,
                            botVersion: "$LATEST",
                            botName: longName,
                            checksum: undefined
                        };
                        _c.label = 22;
                    case 22:
                        _c.trys.push([22, 24, , 25]);
                        return [4 /*yield*/, this.builder
                                .getBotAlias({
                                botName: longName,
                                name: versionAlias
                            })
                                .promise()];
                    case 23:
                        alias = _c.sent();
                        aliasReq.checksum = alias.checksum;
                        return [3 /*break*/, 25];
                    case 24:
                        err_4 = _c.sent();
                        return [3 /*break*/, 25];
                    case 25: return [4 /*yield*/, this.builder
                            .putBotAlias(aliasReq)
                            .promise()];
                    case 26:
                        aliasResponse = _c.sent();
                        arn = "arn:aws:lex:" +
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
                        _c.label = 27;
                    case 27:
                        _i++;
                        return [3 /*break*/, 3];
                    case 28: return [2 /*return*/, arns];
                    case 29:
                        err_5 = _c.sent();
                        console.log(err_5);
                        throw err_5;
                    case 30: return [2 /*return*/];
                }
            });
        });
    };
    LexBuilder.prototype.convertTypeToLex = function (alexaType, longName, version) {
        return {
            name: longName + "_" + alexaType.name,
            version: version,
            enumerationValues: alexaType.values.map(function (v) {
                return {
                    value: v.name.value,
                    synonyms: v.name.synonyms
                };
            }),
            valueSelectionStrategy: "TOP_RESOLUTION"
        };
    };
    LexBuilder.prototype.convertSlotToLex = function (alexaSlot, longName, version) {
        return __assign({ name: longName + "_" + alexaSlot.name }, (alexaSlot.type.includes("AMAZON")
            ? {}
            : { slotTypeVersion: version }), { sampleUtterances: alexaSlot.samples
                ? alexaSlot.samples.map(function (s) {
                    return s.replace(/{(.+)}/, "{" + longName + "_$1}");
                })
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
    };
    LexBuilder.prototype.convertIntentToLexBuiltin = function (alexaIntent, longName, version) {
        return {
            name: longName + "_" + alexaIntent.name.replace("AMAZON.", "BMAZON_"),
            version: version,
            fulfillmentActivity: {
                type: "ReturnIntent"
            },
            parentIntentSignature: alexaIntent.name
        };
    };
    LexBuilder.prototype.convertIntentToLex = function (alexaIntent, longName, version) {
        var _this = this;
        return {
            name: longName + "_" + alexaIntent.name.replace(".", "_"),
            version: version,
            fulfillmentActivity: {
                type: "ReturnIntent"
            },
            sampleUtterances: alexaIntent.samples
                ? alexaIntent.samples.map(function (s) {
                    return s.replace(/{(.+)}/, "{" + longName + "_$1}");
                })
                : [],
            slots: alexaIntent.slots
                ? alexaIntent.slots.map(function (s) {
                    return _this.convertSlotToLex(s, longName, version);
                })
                : []
        };
    };
    LexBuilder.prototype.convertLangToLex = function (alexaModel, locale, longName, version) {
        var _this = this;
        var filtered = alexaModel.intents.filter(function (i) {
            return i.name != "AMAZON.FallbackIntent" &&
                i.name != "AMAZON.ScrollUpIntent" &&
                i.name != "AMAZON.ScrollLeftIntent" &&
                i.name != "AMAZON.ScrollDownIntent" &&
                i.name != "AMAZON.ScrollRightIntent" &&
                i.name != "AMAZON.PageDownIntent" &&
                i.name != "AMAZON.PageUpIntent" &&
                i.name != "AMAZON.MoreIntent" &&
                i.name != "AMAZON.NavigateHomeIntent" &&
                i.name != "AMAZON.NavigateSettingsIntent";
        });
        var intents = filtered.map(function (i) {
            return _this.convertIntentToLex(i, longName, version);
        });
        var intentsBuiltIn = filtered
            .filter(function (i) {
            return i.name.indexOf("AMAZON.") == 0 &&
                i.name != "AMAZON.YesIntent" &&
                i.name != "AMAZON.NoIntent";
        })
            .map(function (i) { return _this.convertIntentToLexBuiltin(i, longName, version); });
        return {
            metadata: {
                schemaVersion: "1.0",
                importType: "LEX",
                importFormat: "JSON"
            },
            resource: {
                name: longName,
                version: version,
                intents: intents.concat(intentsBuiltIn),
                slotTypes: alexaModel.types.map(function (t) {
                    return _this.convertTypeToLex(t, longName, version);
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
    };
    return LexBuilder;
}());
exports.LexBuilder = LexBuilder;
