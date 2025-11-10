const SENT_ITEMS_FILE = "data/sent-items.json";

export async function wasSent(id: string): Promise<boolean> {
  try {
    const file = Bun.file(SENT_ITEMS_FILE);
    if (!(await file.exists())) return false;

    const sentItems = (await file.json()) as Record<string, boolean>;
    return !!sentItems[id];
  } catch {
    return false;
  }
}

export async function markAsSent(id: string): Promise<void> {
  try {
    const file = Bun.file(SENT_ITEMS_FILE);
    let sentItems: Record<string, boolean> = {};

    if (await file.exists()) {
      sentItems = (await file.json()) as Record<string, boolean>;
    }

    sentItems[id] = true;
    await Bun.write(SENT_ITEMS_FILE, JSON.stringify(sentItems));
  } catch (error) {
    console.error("Error marking item as sent:", error);
  }
}
