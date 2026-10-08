using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;

// Invoke the command from Live's own menu. A global Ctrl+S can be consumed by
// the embedded Max editor even while the Live main window is foreground.
public static class AbletonSetSave
{
    [StructLayout(LayoutKind.Sequential)]
    struct Message {
        public IntPtr Window; public uint Id; public UIntPtr W; public IntPtr L;
        public uint Time; public int X, Y; public uint Private;
    }
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] static extern bool PeekMessage(out Message message, IntPtr window, uint min, uint max, uint remove);
    [DllImport("user32.dll")] static extern bool PostThreadMessage(uint thread, uint message, UIntPtr w, IntPtr l);
    [DllImport("user32.dll")] static extern int GetMessage(out Message message, IntPtr window, uint min, uint max);

    public static void CompleteLaunchFeedback()
    {
        // Windows clears process-launch cursor feedback on the first GetMessage.
        // Post our own thread message first so this never waits for mouse input.
        Message message;
        var threadMessages = new IntPtr(-1);
        const uint marker = 0x8001;
        PeekMessage(out message, threadMessages, marker, marker, 0);
        if (PostThreadMessage(GetCurrentThreadId(), marker, UIntPtr.Zero, IntPtr.Zero))
            GetMessage(out message, threadMessages, marker, marker);
    }
    public struct SaveCommand { public IntPtr Menu; public int Position; public uint Id; }
    public static bool WindowAvailable(IntPtr window) { return IsWindow(window) && IsWindowEnabled(window); }
    [StructLayout(LayoutKind.Sequential)]
    struct MenuInfo {
        public uint Size, Mask, Style, MaxHeight;
        public IntPtr Background;
        public uint ContextHelpId;
        public UIntPtr MenuData;
    }
    [DllImport("user32.dll")] static extern IntPtr GetMenu(IntPtr window);
    [DllImport("user32.dll")] static extern int GetMenuItemCount(IntPtr menu);
    [DllImport("user32.dll")] static extern IntPtr GetSubMenu(IntPtr menu, int position);
    [DllImport("user32.dll")] static extern uint GetMenuItemID(IntPtr menu, int position);
    [DllImport("user32.dll")] static extern uint GetMenuState(IntPtr menu, uint position, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int GetMenuString(IntPtr menu, uint position, StringBuilder text, int count, uint flags);
    [DllImport("user32.dll", SetLastError = true)] static extern bool GetMenuInfo(IntPtr menu, ref MenuInfo info);
    [DllImport("user32.dll", SetLastError = true)]
    static extern bool PostMessage(IntPtr window, uint message, UIntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] static extern bool IsWindowEnabled(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr window, int command);

    static void Find(IntPtr menu, List<SaveCommand> matches, int depth)
    {
        if (depth > 8) return;
        int count = GetMenuItemCount(menu);
        for (int position = 0; position < count; position++) {
            IntPtr child = GetSubMenu(menu, position);
            if (child != IntPtr.Zero) { Find(child, matches, depth + 1); continue; }
            int length = GetMenuString(menu, (uint)position, null, 0, 0x400);
            if (length <= 0 || length > 4096) continue;
            var text = new StringBuilder(length + 1);
            GetMenuString(menu, (uint)position, text, text.Capacity, 0x400);
            string[] parts = text.ToString().Split('\t');
            // Match the exact accelerator, never Save As/Copy/Collect All.
            // The shortcut also identifies translated labels (e.g. German).
            if (parts.Length != 2 || !Regex.IsMatch(parts[1].Trim(), @"^(Ctrl|Control|Strg)\s*\+\s*S$", RegexOptions.IgnoreCase)) continue;
            uint id = GetMenuItemID(menu, position);
            if (id == 0 || id == UInt32.MaxValue || id > UInt16.MaxValue) continue;
            matches.Add(new SaveCommand { Menu = menu, Position = position, Id = id });
        }
    }

    public static SaveCommand FindSave(IntPtr window)
    {
        var matches = new List<SaveCommand>();
        Find(GetMenu(window), matches, 0);
        if (matches.Count != 1)
            throw new InvalidOperationException("Could not identify Live's Save Live Set menu command. Use File > Save Live Set in Live.");
        var command = matches[0];
        uint state = GetMenuState(command.Menu, (uint)command.Position, 0x400);
        if (state == UInt32.MaxValue || (state & 3) != 0)
            throw new InvalidOperationException("Save Live Set is unavailable in Live. Close any open dialog and try again.");
        return command;
    }

    public static void Save(IntPtr window)
    {
        if (!IsWindow(window) || !IsWindowEnabled(window))
            throw new InvalidOperationException("Live's main window is unavailable. Close any open dialog and try again.");
        var command = FindSave(window);
        var info = new MenuInfo { Size = (uint)Marshal.SizeOf(typeof(MenuInfo)), Mask = 0x10 };
        if (!GetMenuInfo(command.Menu, ref info))
            throw new InvalidOperationException("Could not read Live's Save menu. Use File > Save Live Set in Live.");
        if (IsIconic(window)) ShowWindow(window, 9);
        // The device is already inside Live. Avoid reactivating its main window
        // from an external helper while the pointer remains over the device.
        bool byPosition = (info.Style & 0x08000000) != 0; // MNS_NOTIFYBYPOS
        if (!PostMessage(window, byPosition ? 0x126u : 0x111u,
            new UIntPtr(byPosition ? (uint)command.Position : command.Id),
            byPosition ? command.Menu : IntPtr.Zero))
            throw new InvalidOperationException("Windows could not request Save in Live. Run Live and the companion at the same privilege level.");
    }
}
