---
name: Hop To It
tagline: Spare minutes, one chore done.
kind: iPhone app
platform: iPhone (iOS 17 or later)
status: beta
statusNote: Works today. Not in the App Store yet; build it from the source code with Xcode.
problem: The chore list for a home keeps growing, and when a free half hour shows up, deciding what to tackle eats into it.
forWho: Anyone with a running list of things to fix, clean or sort around the house who'd rather be told what fits right now.
price: Free
license: Open source (MIT)
started: 2026-07-09
updated: 2026-10-09
order: 5
links:
  - label: View the code on GitHub
    url: https://github.com/RawkRabbit/hop-to-it
    primary: true
---

<img src="/projects/hop-to-it/icon.png" width="96" height="96" alt="Hop To It app icon: a house with rabbit ears and an orange door with a check mark" style="border-radius:22px">

<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin:1.5rem 0">
  <img src="/projects/hop-to-it/do-now.jpg" width="600" height="1304" loading="lazy" alt="Do Now screen: Quick Capture, a time slider set to 30 minutes, an energy picker and a Find a Task button" style="margin:0">
  <img src="/projects/hop-to-it/suggestions.jpg" width="600" height="1304" loading="lazy" alt="Two suggested chores for 30 minutes at any energy, one marked high priority" style="margin:0">
  <img src="/projects/hop-to-it/tasks.jpg" width="600" height="1304" loading="lazy" alt="Tasks list grouped by room, with time, energy and repeat details on each chore" style="margin:0">
  <img src="/projects/hop-to-it/edit-task.jpg" width="600" height="1304" loading="lazy" alt="Edit Task screen with room, estimated time, priority, energy and a repeat setting of every month" style="margin:0">
</div>

## What it does

Write each chore down with the room it's in, roughly how long it takes and how much energy it needs. When you have a free stretch, tell the app how much time and energy you have, and it picks one or two chores that fit.

- **Quick Capture:** type or dictate "vacuum the living room, ten minutes" and it fills in the room and the time for you.
- **Find a Task:** set your time (5 minutes to 8 hours) and energy. Higher-priority chores come up more often.
- **Repeating chores:** water the plants every week, change the furnace filter every three months. Mark one done and it comes back on its next date.
- **Siri and Shortcuts:** say "I have 30 minutes in Hop To It" and Siri suggests a chore.
- **Undo, history and export:** undo a Mark Done, see what you finished and when, and export everything as CSV or JSON.

Everything stays on your iPhone. No account, no ads, no analytics.

## Try it

Hop To It isn't in the App Store yet. If you have a Mac with Xcode, download the code from GitHub, open `HopToIt.xcodeproj` and run it on your iPhone or the simulator.

## What's next

- **App Store or TestFlight**, once it has had more real-world use.
