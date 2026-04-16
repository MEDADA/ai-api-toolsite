export declare const RECHARGE_TIERS: readonly [{
    readonly amount: 10;
    readonly gift: 0;
    readonly label: "¥10";
}, {
    readonly amount: 50;
    readonly gift: 2;
    readonly label: "¥50 (送¥2)";
}, {
    readonly amount: 100;
    readonly gift: 10;
    readonly label: "¥100 (送¥10)";
}, {
    readonly amount: 500;
    readonly gift: 100;
    readonly label: "¥500 (送¥100)";
}, {
    readonly amount: 1000;
    readonly gift: 250;
    readonly label: "¥1000 (送¥250)";
}];
export type RechargeTier = (typeof RECHARGE_TIERS)[number];
export declare const MODEL_SLUGS: {
    readonly FLUX_2_SCHNELL: "flux-2-schnell";
    readonly FLUX_2_DEV: "flux-2-dev";
    readonly WANXIANG_2_6: "wanxiang-2-6";
    readonly SEEDANCE_2_0: "seedance-2-0";
    readonly SEEDANCE_1_5: "seedance-1-5";
    readonly KLING_3_0: "kling-3-0";
    readonly COSYVOICE_V3_FLASH: "cosyvoice-v3-flash";
    readonly FUNASR: "funasr";
};
export declare const MEMBERSHIP: {
    readonly MONTHLY: {
        readonly level: "MONTHLY";
        readonly price: 2900;
        readonly label: "月卡";
        readonly discount: {
            readonly IMAGE: 0.8;
            readonly VIDEO: 0.9;
        };
    };
    readonly YEARLY: {
        readonly level: "YEARLY";
        readonly price: 19900;
        readonly label: "年卡";
        readonly discount: {
            readonly IMAGE: 0.7;
            readonly VIDEO: 0.8;
        };
    };
};
export declare const GIFT_CREDIT_AMOUNT = 500;
export declare const TASK_TIMEOUT_MS: number;
export declare const MAX_RETRIES = 2;
export declare const RETRY_DELAY_MS = 10000;
export declare const SSE_HEARTBEAT_MS = 30000;
export declare const SSE_TIMEOUT_MS = 60000;
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const OSS_DIRS: {
    readonly UPLOAD: "uploads";
    readonly RESULT: "results";
    readonly THUMBNAIL: "thumbnails";
};
export declare const IMAGE_SIZES: readonly ["512", "1024", "1080"];
export declare const IMAGE_HEIGHT_OPTIONS: readonly ["512", "1024", "1920"];
export declare const VIDEO_DURATIONS: readonly [3, 5, 10, 15];
export declare const VIDEO_RESOLUTIONS: readonly ["540p", "720p", "1080p", "4K"];
export declare const TTS_VOICES: readonly ["female_young", "female_mature", "male_young", "male_mature", "child"];
export declare const TTS_SPEED_RANGE: {
    readonly min: 0.5;
    readonly max: 2;
    readonly default: 1;
};
export declare const TTS_VOLUME_RANGE: {
    readonly min: 0;
    readonly max: 100;
    readonly default: 80;
};
export declare const RATE_LIMITS: {
    readonly GENERAL: 60;
    readonly AUTH_CODE: 5;
    readonly GENERATE: 10;
    readonly DAILY_GENERATE: 100;
};
export declare const DEFAULT_INFERENCE_STEPS: "standard";
export declare const DEFAULT_IMAGE_COUNT = 1;
export declare const DEFAULT_VIDEO_FPS = 24;
export declare const MAX_PROMPT_LENGTH = 2000;
export declare const MAX_VIDEO_PROMPT_LENGTH = 500;
export declare const MAX_TTS_TEXT_LENGTH = 5000;
//# sourceMappingURL=constants.d.ts.map