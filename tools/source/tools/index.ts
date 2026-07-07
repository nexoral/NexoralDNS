import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import registerAuthTools from "./registerAuthTools";
import registerDomainTools from "./registerDomainTools";
import registerDnsTools from "./registerDnsTools";
import registerUserTools from "./registerUserTools";
import registerRoleTools from "./registerRoleTools";
import registerAccessControlTools from "./registerAccessControlTools";
import registerDhcpTools from "./registerDhcpTools";
import registerSettingsTools from "./registerSettingsTools";
import registerAnalyticsTools from "./registerAnalyticsTools";
import registerPublicTools from "./registerPublicTools";

export default function registerAllTools(server: McpServer): void {
  registerAuthTools(server);
  registerDomainTools(server);
  registerDnsTools(server);
  registerUserTools(server);
  registerRoleTools(server);
  registerAccessControlTools(server);
  registerDhcpTools(server);
  registerSettingsTools(server);
  registerAnalyticsTools(server);
  registerPublicTools(server);
}
