// Narration checks (SCRIPT-FORMAT v1.7 §1): each check fires on its symptom and stays quiet on connected speech.
import { test } from "node:test";
import assert from "node:assert/strict";
import { narrationIssues, sentences, type NarrationScene } from "../src/episode/narration";

const scenes = (...vos: [string, string][]): NarrationScene[] => vos.map(([part, vo], i) => ({ id: `s${i}`, part, vo }));
const msgs = (s: NarrationScene[]) => narrationIssues(s).map((i) => i.msg).join("\n");

// One person developing a thought: varied rhythm, scenes that continue, one question at most.
const connected = scenes(
  ["hook", "Every time you load a feed, dozens of requests race across the planet, and most of them never reach the company's own servers."],
  ["idea", "That's because a middle layer answers first, the way a receptionist handles most questions before anyone senior gets involved."],
  ["breakdown", "When a request arrives, the middle layer checks whether it already has a recent answer, and if it does, it replies on the spot."],
  ["breakdown", "If it doesn't, it forwards the request to the real server and keeps the reply, so the next person asking gets it straight away."],
  ["breakdown", "That reply can't live forever, because the data underneath changes, so every answer carries an expiry time."],
  ["breakdown", "Once it expires, the next request goes all the way through again. Simple, and it works."],
  ["gist", "That's the gist: answer from nearby whenever the answer is still true. Follow for more."],
);

test("connected narration raises nothing", () => assert.equal(msgs(connected), ""));

test("too few sentences to judge raises nothing", () => {
  assert.deepEqual(narrationIssues(scenes(["hook", "Short."], ["gist", "That's the gist: yes. Follow for more."])), []);
});

test("sentences() drops the required gist formula", () => {
  assert.deepEqual(sentences("That's the gist: keep copies close. Follow for more."), ["keep copies close."]);
  assert.deepEqual(sentences("That's the gist: split it. Part 2 is next, follow so you don't miss it."), ["split it."]);
});

test("staccato: too many very short sentences", () => {
  const s = scenes(["hook", "Servers fail. Disks die. Networks drop. Power goes. Then everything keeps working anyway, because we planned for it from the start."]);
  assert.match(msgs(s), /4 words or fewer/);
});

test("a run of three short sentences across a scene seam", () => {
  const s = scenes(
    ["hook", "Most of the internet runs on copies that sit much closer to you than the original ever could."],
    ["idea", "It's fast. It's cheap."],
    ["breakdown", "It scales. And because the copies are everywhere, one broken server barely matters to anyone watching."],
  );
  assert.match(msgs(s), /very short sentences in a row/);
});

test("no sentence long enough for an idea to develop", () => {
  const s = scenes(["hook", "Caches are fast. They keep hot data in memory. Reads skip the database. Writes still go to it. That keeps things simple."]);
  assert.match(msgs(s), /no room for an explanation to develop/);
});

test("the same opener again and again", () => {
  const s = scenes(["hook", "TCP checks every packet arrives in order before handing it over. TCP resends anything lost along the way, however long it takes. TCP waits for an acknowledgement before it moves on. TCP is careful."]);
  assert.match(msgs(s), /start with "tcp"/);
});

test("filler transitions", () => {
  const s = scenes(["hook", "Now the request leaves your phone and crosses an ocean to get there. So it takes a while to come back with anything. But the server answers eventually, once it has found the file. And then the page finally draws."]);
  assert.match(msgs(s), /filler transition/);
});

test("textbook and influencer phrasing", () => {
  const s = scenes(["hook", "A load balancer refers to a server that spreads traffic across many machines so none of them fall over. Here's the thing, it changes everything about uptime for teams of any size. Each machine only sees part of the load. When one dies, the others pick up its share."]);
  const m = msgs(s);
  assert.match(m, /"refers to"/);
  assert.match(m, /"Here's the thing"/);
});

test("more than one rhetorical question", () => {
  const s = scenes(["hook", "Why is your feed so fast when the servers are an ocean away from you? What's really going on? Who answers first, and how does it know what you want before you ask? The answer starts with a copy that lives much closer to you than the original."]);
  assert.match(msgs(s), /rhetorical questions/);
});

test("breakdown scenes that each open cold", () => {
  const s = scenes(
    ["hook", "Every app you use talks to a server somewhere, and usually you never notice the conversation at all."],
    ["breakdown", "Round robin sends each new request to the next server in the list, one after another, forever."],
    ["breakdown", "Least connections picks whichever server is handling the fewest requests at that exact moment."],
    ["breakdown", "Health checks ping every server on a timer and quietly drop the ones that stop answering."],
    ["breakdown", "Layer seven balancing reads the request itself before deciding where the request should go."],
  );
  assert.match(msgs(s), /breakdown scenes lean on what came before/);
});
