import { z } from "zod";
import { COOLING_CONFIG, INPUT_LIMITS } from "./constants";

export const pinSchema = z.object({
  pin: z.string().min(1, "PIN을 입력해주세요"),
  name: z.string().min(1, "이름을 입력해주세요").max(20, "이름은 20자 이내"),
});

export const statusChangeSchema = z.object({
  status: z.enum([
    "preparing",
    "cooling",
    "available",
    "sold_out",
    "broken",
  ]),
  coolingMinutes: z
    .number()
    .min(COOLING_CONFIG.MIN_MINUTES)
    .max(COOLING_CONFIG.MAX_MINUTES)
    .optional(),
  adminName: z.string().min(1),
});

export const flavorChangeSchema = z.object({
  flavor: z.string().max(INPUT_LIMITS.FLAVOR_MAX_LENGTH),
  adminName: z.string().min(1),
});

export const reportSoldOutSchema = z.object({
  deviceId: z.string().uuid(),
  fingerprint: z.string().min(1).max(128),
});

export const announcementSchema = z.object({
  content: z
    .string()
    .min(1, "내용 입력 필요")
    .max(INPUT_LIMITS.ANNOUNCEMENT_MAX_LENGTH),
  createdBy: z.string().min(1),
});

export const emailRecipientSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
});

export const cleanSchema = z.object({
  adminName: z.string().min(1),
});
