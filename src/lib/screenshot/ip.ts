import {BlockList, isIP} from "node:net";

/**
 * Address classification used by the screenshot service to make sure it only
 * ever talks to public internet hosts.
 *
 * IPv4: everything in the special-purpose registries is denied.
 * IPv6: only global unicast (2000::/3) is allowed, minus documentation space.
 * IPv4-mapped / NAT64 IPv6 forms are unwrapped and checked as IPv4.
 */

const deniedV4 = new BlockList();
const DENIED_V4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (cloud metadata lives here)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay (deprecated)
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];
for (const [network, prefix] of DENIED_V4_RANGES) {
  deniedV4.addSubnet(network, prefix, "ipv4");
}

const deniedV6 = new BlockList();
deniedV6.addSubnet("2001::", 23, "ipv6"); // IETF protocol assignments, Teredo
deniedV6.addSubnet("2001:db8::", 32, "ipv6"); // documentation
deniedV6.addSubnet("2002::", 16, "ipv6"); // 6to4 (embeds arbitrary IPv4)
deniedV6.addSubnet("3fff::", 20, "ipv6"); // documentation

/** Expands any valid IPv6 literal (incl. `::` and dotted-quad tails) into 8 groups. */
export function expandIPv6(input: string): number[] | null {
  let address = input.split("%")[0];
  if (isIP(address) !== 6) return null;

  const dotted = address.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const octets = dotted[1].split(".").map(Number);
    const hi = ((octets[0] << 8) | octets[1]).toString(16);
    const lo = ((octets[2] << 8) | octets[3]).toString(16);
    address = address.slice(0, -dotted[1].length) + `${hi}:${lo}`;
  }

  const [head, tail] = address.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail === undefined ? [] : tail ? tail.split(":") : [];
  const missing = 8 - headGroups.length - tailGroups.length;
  const groups =
    tail === undefined
      ? headGroups
      : [...headGroups, ...Array(Math.max(missing, 0)).fill("0"), ...tailGroups];

  if (groups.length !== 8) return null;
  const parsed = groups.map((group) => parseInt(group, 16));
  return parsed.some((value) => Number.isNaN(value)) ? null : parsed;
}

function groupsToIPv4(high: number, low: number) {
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

/** True only for addresses that are routable on the public internet. */
export function isPublicIp(address: string): boolean {
  const family = isIP(address);

  if (family === 4) {
    return !deniedV4.check(address, "ipv4");
  }

  if (family === 6) {
    const groups = expandIPv6(address);
    if (!groups) return false;

    const firstFiveZero = groups.slice(0, 5).every((group) => group === 0);
    // ::ffff:a.b.c.d (IPv4-mapped)
    if (firstFiveZero && groups[5] === 0xffff) {
      return isPublicIp(groupsToIPv4(groups[6], groups[7]));
    }
    // 64:ff9b::a.b.c.d (NAT64 well-known prefix)
    if (
      groups[0] === 0x64 &&
      groups[1] === 0xff9b &&
      groups.slice(2, 6).every((group) => group === 0)
    ) {
      return isPublicIp(groupsToIPv4(groups[6], groups[7]));
    }

    // Everything outside global unicast 2000::/3 is denied
    // (loopback, unspecified, ULA fc00::/7, link-local fe80::/10, multicast, ...).
    if ((groups[0] & 0xe000) !== 0x2000) return false;

    return !deniedV6.check(address, "ipv6");
  }

  return false;
}

/**
 * Rate-limit bucket for a client address. IPv6 clients are bucketed by /64 so
 * rotating through addresses in one allocation cannot dodge the limit.
 */
export function rateLimitKeyFor(address: string): string {
  if (isIP(address) === 6) {
    const groups = expandIPv6(address);
    if (groups) {
      return groups
        .slice(0, 4)
        .map((group) => group.toString(16))
        .join(":") + "::/64";
    }
  }
  return address;
}
