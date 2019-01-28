import { SlsAlexa } from "./alexa";

export interface ServerlessInstance {
    cli: {
        log(str: string): void
    }
    config: {
        servicePath: string
    }
    service: {
        provider: ServerlessProvider,
        custom: {
            lex: LexCustomConfig[],
            alexa: SlsAlexa
        },
        functions: { [key: string]: ServerlessFunction }
        package: ServerlessPackage
        getAllFunctions: () => string[]
    }
    pluginManager: PluginManager
    getProvider: (name: string) => ServerlessProvider;
}

export interface LexCustomConfig {
    name: string,
    alexaImportSkillId: string
}

export interface ServerlessOptions {
    function?: string
    watch?: boolean
    extraServicePath?: string
}

export interface ServerlessFunction {
    handler: string
    package: ServerlessPackage
}

export interface ServerlessPackage {
    include: string[]
    exclude: string[]
    artifact?: string
    individually?: boolean
}

export interface PluginManager {
    spawn(command: string): Promise<void>
    plugins: []
    commands: []
    hooks: []
}

export interface ServerlessProvider {
    name: string
    getCredentials(): ServerlessAWSCredentials;
    getAccountId(): Promise<string>;
}

export interface ServerlessAWSCredentials {
    region: string;
    credentials?: {
        secretAccessKey: string;
        accessKeyId: string;
    }
    secretAccessKey?: string;
    accessKeyId?: string;
}