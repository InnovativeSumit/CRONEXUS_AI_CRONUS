import { Router } from "express";
import type { Config } from "../config.js";
import type { Stores } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { cleanAvatar, publicUser } from "../profile.js";
import { profileSchema, zodMessage } from "../validators.js";

export function profileRouter(cfg: Config, stores: Stores) {
  const r = Router();
  const auth = requireAuth(cfg, stores);

  r.patch("/", auth, async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodMessage(parsed.error));
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) set.name = parsed.data.name;
    if (parsed.data.avatar !== undefined) {
      const avatar = cleanAvatar(parsed.data.avatar);
      if (avatar === undefined) return res.status(400).json({ error: "Choose one of the avatars or upload a JPG/PNG/WEBP photo under 90 KB.", fields: { avatar: "Invalid avatar." } });
      set.avatar = avatar;
    }
    await stores.users.updateOne({ _id: req.user!._id }, { $set: set });
    res.json({ user: publicUser({ ...req.user!, ...set } as typeof req.user & object) });
  });

  return r;
}
