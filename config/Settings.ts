import { ISetting, SettingType} from '@rocket.chat/apps-engine/definition/settings';

export enum AppSetting {
    OutputChannel = 'messagereporter_outputchannel',
}

export const settings: Array<ISetting> = [
    {
        id: AppSetting.OutputChannel,
        public: true,
        type: SettingType.STRING,
        value: "General",
        packageValue: "General",
        hidden: false,
        i18nLabel: 'MessageReporter_OutputChannel',
        i18nDescription: 'MessageReporter_OutputChannel_Desc',
        required: false,
    },
]