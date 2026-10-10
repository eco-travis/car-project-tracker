import { localSupabase } from "../../support/local-supabase";

type Summary = {
  ID: string;
  Created: string;
  To: { Address: string }[];
  Subject: string;
};

/** Messages to `address` in the local mail catcher, newest first. */
export async function messagesTo(address: string): Promise<Summary[]> {
  const { mailpitUrl } = localSupabase();
  const res = await fetch(
    `${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`,
  );
  if (!res.ok) throw new Error(`Mailpit search failed: ${res.status}`);
  const body = (await res.json()) as { messages: Summary[] };
  return body.messages;
}

export async function deleteMessagesTo(address: string): Promise<void> {
  const { mailpitUrl } = localSupabase();
  await fetch(
    `${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`,
    { method: "DELETE" },
  );
}

/** The first link in a message's HTML body. */
export async function firstLink(messageId: string): Promise<string> {
  const { mailpitUrl } = localSupabase();
  const res = await fetch(`${mailpitUrl}/api/v1/message/${messageId}`);
  const body = (await res.json()) as { HTML: string };
  const href = /href="([^"]+)"/.exec(body.HTML)?.[1];
  if (!href) throw new Error("No link in message");
  return href.replaceAll("&amp;", "&");
}
