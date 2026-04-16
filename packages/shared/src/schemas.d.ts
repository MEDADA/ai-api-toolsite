import { z } from 'zod';
export declare const SendCodeSchema: z.ZodObject<{
    phone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
}, {
    phone: string;
}>;
export declare const LoginByCodeSchema: z.ZodObject<{
    phone: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    phone: string;
}, {
    code: string;
    phone: string;
}>;
export declare const RefreshTokenSchema: z.ZodObject<{
    refresh_token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refresh_token: string;
}, {
    refresh_token: string;
}>;
export declare const GoogleLoginSchema: z.ZodObject<{
    id_token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id_token: string;
}, {
    id_token: string;
}>;
export declare const AppleLoginSchema: z.ZodObject<{
    identity_token: z.ZodString;
    authorization_code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    identity_token: string;
    authorization_code: string;
}, {
    identity_token: string;
    authorization_code: string;
}>;
export declare const ImageParamsSchema: z.ZodObject<{
    prompt: z.ZodString;
    reference_image_url: z.ZodOptional<z.ZodString>;
    width: z.ZodDefault<z.ZodEnum<["512", "1024", "1080"]>>;
    height: z.ZodDefault<z.ZodEnum<["512", "1024", "1920"]>>;
    style: z.ZodOptional<z.ZodString>;
    num_inference_steps: z.ZodDefault<z.ZodEnum<["fast", "standard", "high"]>>;
    image_count: z.ZodDefault<z.ZodNumber>;
    strength: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    width: "512" | "1024" | "1080";
    height: "512" | "1024" | "1920";
    prompt: string;
    num_inference_steps: "standard" | "fast" | "high";
    image_count: number;
    strength: number;
    reference_image_url?: string | undefined;
    style?: string | undefined;
}, {
    prompt: string;
    width?: "512" | "1024" | "1080" | undefined;
    height?: "512" | "1024" | "1920" | undefined;
    reference_image_url?: string | undefined;
    style?: string | undefined;
    num_inference_steps?: "standard" | "fast" | "high" | undefined;
    image_count?: number | undefined;
    strength?: number | undefined;
}>;
export declare const VideoParamsSchema: z.ZodObject<{
    prompt: z.ZodString;
    duration: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<3>, z.ZodLiteral<5>, z.ZodLiteral<10>, z.ZodLiteral<15>]>>;
    resolution: z.ZodDefault<z.ZodEnum<["540p", "720p", "1080p", "4K"]>>;
    reference_image_url: z.ZodOptional<z.ZodString>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    camera_control: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    duration: 3 | 5 | 10 | 15;
    prompt: string;
    resolution: "540p" | "720p" | "1080p" | "4K";
    fps: number;
    reference_image_url?: string | undefined;
    camera_control?: Record<string, unknown> | undefined;
}, {
    prompt: string;
    duration?: 3 | 5 | 10 | 15 | undefined;
    reference_image_url?: string | undefined;
    resolution?: "540p" | "720p" | "1080p" | "4K" | undefined;
    fps?: number | undefined;
    camera_control?: Record<string, unknown> | undefined;
}>;
export declare const TTSParamsSchema: z.ZodObject<{
    text: z.ZodString;
    voice: z.ZodDefault<z.ZodEnum<["female_young", "female_mature", "male_young", "male_mature", "child"]>>;
    speed: z.ZodDefault<z.ZodNumber>;
    volume: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    text: string;
    voice: "female_young" | "female_mature" | "male_young" | "male_mature" | "child";
    speed: number;
    volume: number;
}, {
    text: string;
    voice?: "female_young" | "female_mature" | "male_young" | "male_mature" | "child" | undefined;
    speed?: number | undefined;
    volume?: number | undefined;
}>;
export declare const ASRParamsSchema: z.ZodObject<{
    audio_url: z.ZodString;
    language: z.ZodDefault<z.ZodEnum<["auto", "zh", "en"]>>;
}, "strip", z.ZodTypeAny, {
    audio_url: string;
    language: "auto" | "zh" | "en";
}, {
    audio_url: string;
    language?: "auto" | "zh" | "en" | undefined;
}>;
export declare const VoiceCloneParamsSchema: z.ZodObject<{
    source_audio_url: z.ZodString;
    target_text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    source_audio_url: string;
    target_text: string;
}, {
    source_audio_url: string;
    target_text: string;
}>;
export declare const CreateTaskSchema: z.ZodObject<{
    source_audio_url: z.ZodString;
    target_text: z.ZodString;
    audio_url: z.ZodString;
    language: z.ZodDefault<z.ZodEnum<["auto", "zh", "en"]>>;
    text: z.ZodString;
    voice: z.ZodDefault<z.ZodEnum<["female_young", "female_mature", "male_young", "male_mature", "child"]>>;
    speed: z.ZodDefault<z.ZodNumber>;
    volume: z.ZodDefault<z.ZodNumber>;
    prompt: z.ZodString;
    duration: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<3>, z.ZodLiteral<5>, z.ZodLiteral<10>, z.ZodLiteral<15>]>>;
    resolution: z.ZodDefault<z.ZodEnum<["540p", "720p", "1080p", "4K"]>>;
    reference_image_url: z.ZodOptional<z.ZodString>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    camera_control: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    width: z.ZodDefault<z.ZodEnum<["512", "1024", "1080"]>>;
    height: z.ZodDefault<z.ZodEnum<["512", "1024", "1920"]>>;
    style: z.ZodOptional<z.ZodString>;
    num_inference_steps: z.ZodDefault<z.ZodEnum<["fast", "standard", "high"]>>;
    image_count: z.ZodDefault<z.ZodNumber>;
    strength: z.ZodDefault<z.ZodNumber>;
    model_slug: z.ZodString;
    idem_key: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    source_audio_url: z.ZodString;
    target_text: z.ZodString;
    audio_url: z.ZodString;
    language: z.ZodDefault<z.ZodEnum<["auto", "zh", "en"]>>;
    text: z.ZodString;
    voice: z.ZodDefault<z.ZodEnum<["female_young", "female_mature", "male_young", "male_mature", "child"]>>;
    speed: z.ZodDefault<z.ZodNumber>;
    volume: z.ZodDefault<z.ZodNumber>;
    prompt: z.ZodString;
    duration: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<3>, z.ZodLiteral<5>, z.ZodLiteral<10>, z.ZodLiteral<15>]>>;
    resolution: z.ZodDefault<z.ZodEnum<["540p", "720p", "1080p", "4K"]>>;
    reference_image_url: z.ZodOptional<z.ZodString>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    camera_control: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    width: z.ZodDefault<z.ZodEnum<["512", "1024", "1080"]>>;
    height: z.ZodDefault<z.ZodEnum<["512", "1024", "1920"]>>;
    style: z.ZodOptional<z.ZodString>;
    num_inference_steps: z.ZodDefault<z.ZodEnum<["fast", "standard", "high"]>>;
    image_count: z.ZodDefault<z.ZodNumber>;
    strength: z.ZodDefault<z.ZodNumber>;
    model_slug: z.ZodString;
    idem_key: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    source_audio_url: z.ZodString;
    target_text: z.ZodString;
    audio_url: z.ZodString;
    language: z.ZodDefault<z.ZodEnum<["auto", "zh", "en"]>>;
    text: z.ZodString;
    voice: z.ZodDefault<z.ZodEnum<["female_young", "female_mature", "male_young", "male_mature", "child"]>>;
    speed: z.ZodDefault<z.ZodNumber>;
    volume: z.ZodDefault<z.ZodNumber>;
    prompt: z.ZodString;
    duration: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<3>, z.ZodLiteral<5>, z.ZodLiteral<10>, z.ZodLiteral<15>]>>;
    resolution: z.ZodDefault<z.ZodEnum<["540p", "720p", "1080p", "4K"]>>;
    reference_image_url: z.ZodOptional<z.ZodString>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    camera_control: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    width: z.ZodDefault<z.ZodEnum<["512", "1024", "1080"]>>;
    height: z.ZodDefault<z.ZodEnum<["512", "1024", "1920"]>>;
    style: z.ZodOptional<z.ZodString>;
    num_inference_steps: z.ZodDefault<z.ZodEnum<["fast", "standard", "high"]>>;
    image_count: z.ZodDefault<z.ZodNumber>;
    strength: z.ZodDefault<z.ZodNumber>;
    model_slug: z.ZodString;
    idem_key: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const GetTasksQuerySchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["IMAGE", "VIDEO", "AUDIO", "TTS", "ASR", "VOICE_CLONE"]>>;
    status: z.ZodOptional<z.ZodEnum<["CREATED", "QUEUED", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED", "REFUND_PENDING", "REFUNDED"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    page_size: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    page_size: number;
    type?: "IMAGE" | "VIDEO" | "AUDIO" | "TTS" | "ASR" | "VOICE_CLONE" | undefined;
    status?: "CREATED" | "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUND_PENDING" | "REFUNDED" | undefined;
}, {
    type?: "IMAGE" | "VIDEO" | "AUDIO" | "TTS" | "ASR" | "VOICE_CLONE" | undefined;
    status?: "CREATED" | "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUND_PENDING" | "REFUNDED" | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
}>;
export declare const WalletLedgerQuerySchema: z.ZodObject<{
    tx_type: z.ZodOptional<z.ZodEnum<["RECHARGE", "GIFT_CREDIT", "TASK_FREEZE", "TASK_SETTLE", "TASK_REFUND", "MEMBERSHIP_PURCHASE", "MANUAL_ADJUSTMENT"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    page_size: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    page_size: number;
    tx_type?: "RECHARGE" | "GIFT_CREDIT" | "TASK_FREEZE" | "TASK_SETTLE" | "TASK_REFUND" | "MEMBERSHIP_PURCHASE" | "MANUAL_ADJUSTMENT" | undefined;
}, {
    page?: number | undefined;
    page_size?: number | undefined;
    tx_type?: "RECHARGE" | "GIFT_CREDIT" | "TASK_FREEZE" | "TASK_SETTLE" | "TASK_REFUND" | "MEMBERSHIP_PURCHASE" | "MANUAL_ADJUSTMENT" | undefined;
}>;
export declare const RechargeCreateSchema: z.ZodObject<{
    amount: z.ZodEffects<z.ZodNumber, number, number>;
    pay_method: z.ZodEnum<["alipay", "wechat", "stripe", "paypal"]>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    pay_method: "alipay" | "wechat" | "stripe" | "paypal";
}, {
    amount: number;
    pay_method: "alipay" | "wechat" | "stripe" | "paypal";
}>;
export declare const OssUploadTokenSchema: z.ZodObject<{
    type: z.ZodEnum<["UPLOAD", "RESULT", "THUMBNAIL"]>;
}, "strip", z.ZodTypeAny, {
    type: "UPLOAD" | "RESULT" | "THUMBNAIL";
}, {
    type: "UPLOAD" | "RESULT" | "THUMBNAIL";
}>;
export declare const CreateFavoriteSchema: z.ZodObject<{
    task_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    task_id: string;
}, {
    task_id: string;
}>;
export declare const DeleteFavoriteSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    page_size: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    page_size: number;
}, {
    page?: number | undefined;
    page_size?: number | undefined;
}>;
export declare const TaskIdSchema: z.ZodObject<{
    task_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    task_id: string;
}, {
    task_id: string;
}>;
export declare const FavoriteIdSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type SendCodeInput = z.infer<typeof SendCodeSchema>;
export type LoginByCodeInput = z.infer<typeof LoginByCodeSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type RechargeCreateInput = z.infer<typeof RechargeCreateSchema>;
//# sourceMappingURL=schemas.d.ts.map