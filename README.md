PodBean Roam
============

[![build](https://github.com/aroundourtable/podbean-roam/workflows/build/badge.svg)](https://github.com/aroundourtable/podbean-roam/actions)
[![license](https://img.shields.io/github/license/aroundourtable/podbean-roam)](https://github.com/aroundourtable/podbean-roam/blob/master/LICENSE)
[![version](https://img.shields.io/github/package-json/v/aroundourtable/podbean-roam)](https://github.com/aroundourtable/podbean-roam/blob/master/package.json)
[![docs](https://img.shields.io/badge/docs-master-informational)](https://aroundourtable.github.io/podbean-roam/)


A chrome extension to make hosting roams with podbean easier.

This extension simply automates some of the processes necessary for hosting a
roam via podbean using some javascript hacks.

While this extension might not be of much use to anyone outside of Around our
Table, it might provide a backbone for extending the PodBean live interface.

Developing
----------

Simply run `yarn prod` to compile the extension zip `podbean-roam.zip`.
`yarn build` will build a development version.

To Do List
----------

- [ ] Understand how participant view changes with more than seven callers
- [ ] Better auto add as a result of tracking
- [ ] Add source maps to dev setup
- [ ] Tracking time spend talking instead of just time spent in sessions / number of sessions
- [ ] Exposing configuration options somewhere, either in extension page or in
  website or something
