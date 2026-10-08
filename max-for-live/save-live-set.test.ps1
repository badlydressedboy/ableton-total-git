$ErrorActionPreference = 'Stop'
# Hidden test windows only: never request a save from a running Live instance.
$taskSource = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'save-live-set.windows.cs') -Raw
$taskFixture = @'
public static class SaveMenuRegression {
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern System.IntPtr CreateMenu();
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern System.IntPtr CreatePopupMenu();
    [System.Runtime.InteropServices.DllImport("user32.dll", CharSet=System.Runtime.InteropServices.CharSet.Unicode)]
    static extern bool AppendMenu(System.IntPtr menu, uint flags, System.UIntPtr id, string text);
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool SetMenu(System.IntPtr window, System.IntPtr menu);
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool DestroyMenu(System.IntPtr menu);
    [System.Runtime.InteropServices.DllImport("user32.dll")] static extern bool SetMenuInfo(System.IntPtr menu, ref TestMenuInfo info);
    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]
    struct TestMenuInfo { public uint Size, Mask, Style, MaxHeight; public System.IntPtr Background; public uint Help; public System.UIntPtr Data; }
    class Window : System.Windows.Forms.NativeWindow, System.IDisposable {
        public int Commands;
        public uint Message;
        public System.IntPtr W, L;
        public Window() { CreateHandle(new System.Windows.Forms.CreateParams { Caption="Ableton Total Git hidden save test" }); }
        protected override void WndProc(ref System.Windows.Forms.Message message) {
            if (message.Msg == 0x111 || message.Msg == 0x126) { Commands++; Message=(uint)message.Msg; W=message.WParam; L=message.LParam; }
            base.WndProc(ref message);
        }
        public void Dispose() { DestroyHandle(); }
    }
    static void Check(bool condition, string message) { if (!condition) throw new System.Exception(message); }
    static void Test(string label, bool byPosition, bool disabled, bool duplicate, bool missing) {
        using (var window = new Window()) {
            var menu=CreateMenu(); var file=CreatePopupMenu();
            try {
                AppendMenu(menu, 0x10, new System.UIntPtr((ulong)file.ToInt64()), "File");
                AppendMenu(file, 0, new System.UIntPtr(100), "Save Live Set As...\tCtrl+Shift+S");
                AppendMenu(file, 0, new System.UIntPtr(101), "Collect All and Save");
                AppendMenu(file, disabled ? 1u : 0u, new System.UIntPtr(231), missing ? "Save Copy" : label);
                if (duplicate) AppendMenu(file, 0, new System.UIntPtr(232), label);
                if (byPosition) {
                    var info = new TestMenuInfo { Size=(uint)System.Runtime.InteropServices.Marshal.SizeOf(typeof(TestMenuInfo)), Mask=0x10, Style=0x08000000 };
                    Check(SetMenuInfo(file,ref info), "SetMenuInfo failed");
                }
                Check(SetMenu(window.Handle,menu), "SetMenu failed");
                if (disabled || duplicate || missing) {
                    bool rejected=false;
                    try { AbletonSetSave.Save(window.Handle); } catch (System.InvalidOperationException) { rejected=true; }
                    Check(rejected,"Unavailable/ambiguous command must be rejected");
                    System.Windows.Forms.Application.DoEvents();
                    Check(window.Commands==0,"Rejected request posted a command");
                } else {
                    AbletonSetSave.Save(window.Handle);
                    System.Windows.Forms.Application.DoEvents();
                    Check(window.Commands==1,"Expected exactly one save command");
                    Check(window.Message==(byPosition ? 0x126u : 0x111u),"Incorrect menu message");
                    System.IntPtr receivedW = window.W;
                    Check(receivedW.ToInt64()==(byPosition ? 2 : 231),"Wrong command: Save As/Collect All must not run");
                    Check(window.L==(byPosition ? file : System.IntPtr.Zero),"Incorrect command menu handle");
                }
            } finally { SetMenu(window.Handle,System.IntPtr.Zero); DestroyMenu(menu); }
        }
    }
    public static void Run() {
        AbletonSetSave.CompleteLaunchFeedback();
        Test("Save Live Set\tCtrl+S",false,false,false,false);
        Test("Save Live Set\tCtrl+S",true,false,false,false);
        Test("Live-Set speichern\tStrg+S",false,false,false,false);
        Test("Save Live Set\tCtrl+S",false,true,false,false);
        Test("Save Live Set\tCtrl+S",false,false,true,false);
        Test("Save Live Set\tCtrl+S",false,false,false,true);
        System.Console.WriteLine("6 native Save menu regression cases passed.");
    }
}
'@
Add-Type -TypeDefinition ($taskSource + "`n" + $taskFixture) -ReferencedAssemblies System.Windows.Forms,System.Drawing
[SaveMenuRegression]::Run()
