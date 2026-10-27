import type { SyntheticBrowserProvider, SyntheticProviderName } from "@/lib/synthetic/browser-provider";
import { BrowserlessSyntheticProvider } from "@/lib/synthetic/providers/browserless-provider";
import { SelfHostedPlaywrightProvider } from "@/lib/synthetic/providers/self-hosted-playwright-provider";
import {
  resolveSyntheticFallbackProviderName,
  resolveSyntheticProviderName,
} from "@/lib/synthetic/synthetic-config";

const browserless = new BrowserlessSyntheticProvider();
const selfHosted = new SelfHostedPlaywrightProvider();

function providerByName(name: SyntheticProviderName): SyntheticBrowserProvider {
  return name === "self_hosted" ? selfHosted : browserless;
}

export function getSyntheticBrowserProvider(): SyntheticBrowserProvider {
  return providerByName(resolveSyntheticProviderName());
}

export function getSyntheticFallbackProvider(): SyntheticBrowserProvider | null {
  const name = resolveSyntheticFallbackProviderName();
  if (!name) return null;
  const primary = resolveSyntheticProviderName();
  if (name === primary) return null;
  return providerByName(name);
}
