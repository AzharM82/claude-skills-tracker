import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

app.http("GetRoles", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "GetRoles",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      let userDetails = "";
      try {
        const body = (await req.json()) as { userDetails?: string } | null;
        userDetails = body?.userDetails ?? "";
      } catch {
        context.warn("GetRoles: could not parse body");
      }
      const admin = (process.env.ADMIN_EMAIL || "").toLowerCase();
      const roles: string[] = [];
      if (userDetails && admin && userDetails.toLowerCase() === admin) {
        roles.push("admin");
      }
      return { status: 200, jsonBody: { roles } };
    } catch (err) {
      context.error("GetRoles error:", (err as Error).message);
      return { status: 200, jsonBody: { roles: [] } };
    }
  },
});
