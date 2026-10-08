tell application "System Events"
    set liveProcesses to every application process whose bundle identifier starts with "com.ableton.live"
    if (count of liveProcesses) is not 1 then error "Open one Ableton Live instance to use Save Live Set."
    set liveProcess to item 1 of liveProcesses
    set frontmost of liveProcess to true
    repeat 10 times
        if frontmost of liveProcess then exit repeat
        delay 0.05
    end repeat
    if not frontmost of liveProcess then error "Could not focus Live. Bring Live to the front and try again."
    tell liveProcess to keystroke "s" using {command down}
end tell
