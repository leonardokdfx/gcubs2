import User from "@/server/models/user";
import { apenasSupervisor, autenticar, json, rota } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = rota(async (req) => {
  apenasSupervisor(autenticar(req));
  return json(await User.find().select("-senha"));
});
