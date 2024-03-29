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
const lexBuilder_1 = require("./lexBuilder");
class LexBot {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;
        this.provider = this.serverless.getProvider('aws');
        this.commands = {
            deploy: {
                lifecycleEvents: [
                    'resources'
                ]
            }
        };
        this.hooks = {
            'after:deploy:resources': () => __awaiter(this, void 0, void 0, function* () { return this.deployLex(); }),
        };
    }
    deployLex() {
        return __awaiter(this, void 0, void 0, function* () {
            const lb = new lexBuilder_1.LexBuilder(this.provider);
            const custom = this.serverless.service.custom;
            const lex = custom.lex;
            for (var bot of lex) {
                console.log("LEX:" + bot.name);
                const arns = yield lb.importModel(custom.alexa, bot.name, bot.alexaImportSkillId);
            }
        });
    }
}
module.exports = LexBot;
//# sourceMappingURL=index.js.map