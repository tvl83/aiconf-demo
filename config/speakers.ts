export type Speaker = {
  name: string;
  title: string;
  bio: string;
  /**
   * Initials-circle fill. No images, per PRD 5c. Values are the AIC-7 spec §6
   * palette -- each is >=7:1 against the white text that sits on it.
   */
  avatarColor: string;
};

export const SPEAKERS: Speaker[] = [
  {
    name: "Jane Smith",
    title: "CEO, FutureTech",
    bio: "Building AI-first products since 2018.",
    avatarColor: "#1A38D6",
  },
  {
    name: "Marcus Lee",
    title: "Research Lead, DeepSystems",
    bio: "Former Google Brain; now open-source AI.",
    avatarColor: "#0A5C2D",
  },
  {
    name: "Priya Patel",
    title: "Founder, AgentLabs",
    bio: "Shipped the first production agentic workflow in 2024.",
    avatarColor: "#7A1560",
  },
];

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
