export interface SlsAlexaType {
    name: string;
    strategy: string;
    values: SlsAlexaTypeValue[];
}
export interface SlsAlexaTypeValue {
    id: string;
    name: {
        value: string;
        synonyms: string[];
    };
}
export interface SlsAlexaIntent {
    name: string;
    slots: SlsAlexaSlot[];
    samples: string[];
}
export interface SlsAlexaSlot {
    name: string;
    type: string;
    samples: string[];
}
export interface SlsAlexaLanguage {
    interactionModel: {
        languageModel: SlsAlexaModel;
    };
}
export interface SlsAlexaModel {
    types: SlsAlexaType[];
    intents: SlsAlexaIntent[];
}
export interface SlsAlexa {
    skills: [{
        id: string;
        models: {
            [key: string]: SlsAlexaLanguage;
        };
    }];
}
