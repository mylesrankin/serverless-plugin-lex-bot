import { ServerlessProvider } from "./sls";
import { SlsAlexa, SlsAlexaType, SlsAlexaIntent, SlsAlexaSlot, SlsAlexaModel } from "./alexa";
export declare class LexBuilder {
    private provider;
    private builder;
    private region;
    constructor(provider: ServerlessProvider);
    exportModel(botName: string, botVersion: number): Promise<void>;
    deduplicate(alexaModel: SlsAlexaModel): SlsAlexaModel;
    importModel(alexaModel: SlsAlexa, botName: string, skillID: string): Promise<string[]>;
    convertTypeToLex(alexaType: SlsAlexaType, longName: string, version: number): any;
    convertSlotToLex(alexaSlot: SlsAlexaSlot, longName: string, version: number): {
        sampleUtterances: string[];
        slotType: string;
        slotConstraint: string;
        priority: number;
        valueElicitationPrompt: {
            messages: {
                contentType: string;
                content: string;
            }[];
            maxAttempts: number;
        };
        name: string;
    } | {
        sampleUtterances: string[];
        slotType: string;
        slotConstraint: string;
        priority: number;
        valueElicitationPrompt: {
            messages: {
                contentType: string;
                content: string;
            }[];
            maxAttempts: number;
        };
        slotTypeVersion: number;
        name: string;
    };
    convertIntentToLexBuiltin(alexaIntent: SlsAlexaIntent, longName: string, version: number): {
        name: string;
        version: number;
        fulfillmentActivity: {
            type: string;
        };
        parentIntentSignature: string;
    };
    convertIntentToLex(alexaIntent: SlsAlexaIntent, longName: string, version: number): {
        name: string;
        version: number;
        fulfillmentActivity: {
            type: string;
        };
        sampleUtterances: string[];
        slots: ({
            sampleUtterances: string[];
            slotType: string;
            slotConstraint: string;
            priority: number;
            valueElicitationPrompt: {
                messages: {
                    contentType: string;
                    content: string;
                }[];
                maxAttempts: number;
            };
            name: string;
        } | {
            sampleUtterances: string[];
            slotType: string;
            slotConstraint: string;
            priority: number;
            valueElicitationPrompt: {
                messages: {
                    contentType: string;
                    content: string;
                }[];
                maxAttempts: number;
            };
            slotTypeVersion: number;
            name: string;
        })[];
    };
    convertLangToLex(alexaModel: SlsAlexaModel, locale: string, longName: string, version: number): any;
}
