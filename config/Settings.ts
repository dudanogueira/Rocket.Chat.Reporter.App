import { ISetting, SettingType} from '@rocket.chat/apps-engine/definition/settings';

export enum AppSetting {
    OutputChannel = 'messagereporter_outputchannel',
}

export const settings: Array<ISetting> = [
    {
        id: AppSetting.OutputChannel,
        public: true,
        type: SettingType.STRING,
        value: "general",
        packageValue: "general",
        hidden: false,
        i18nLabel: 'Reporter_OutputChannel',
        i18nDescription: 'Reporter_OutputChannel_Desc',
        required: false,
    },
]