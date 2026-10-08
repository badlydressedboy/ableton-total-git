-- Read only: never activate Live or send keystrokes while checking for edits.
use framework "Foundation"
use scripting additions
on run
    set previousState to ""
    set outputHandle to current application's NSFileHandle's fileHandleWithStandardOutput()
    repeat
        set currentState to "{\"available\":false}"
        tell application "System Events"
            set liveProcesses to every application process whose bundle identifier starts with "com.ableton.live"
            if (count of liveProcesses) is 1 then
                tell item 1 of liveProcesses
                    if (count of windows) > 0 then
                        set liveWindow to missing value
                        repeat with candidate in windows
                            try
                                if value of attribute "AXMain" of candidate is true then
                                    set liveWindow to candidate
                                    exit repeat
                                end if
                            end try
                        end repeat
                        if liveWindow is not missing value then
                        try
                            set edited to value of attribute "AXEdited" of liveWindow
                            if edited is true then
                                set currentState to "{\"available\":true,\"modified\":true}"
                            else if edited is false then
                                set currentState to "{\"available\":true,\"modified\":false}"
                            end if
                        on error
                            try
                                set edited to value of attribute "AXEdited" of (first button of liveWindow whose subrole is "AXCloseButton")
                                if edited is true then
                                    set currentState to "{\"available\":true,\"modified\":true}"
                                else if edited is false then
                                    set currentState to "{\"available\":true,\"modified\":false}"
                                end if
                            end try
                        end try
                        end if
                    end if
                end tell
            end if
        end tell
        if currentState is not previousState then
            set stateLine to current application's NSString's stringWithString:(currentState & linefeed)
            outputHandle's writeData:(stateLine's dataUsingEncoding:4)
            set previousState to currentState
        end if
        delay 0.5
    end repeat
end run
