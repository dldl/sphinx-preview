# Sphinx-Preview

Sphinx-Preview allows you to write and preview
[Sphinx Documentation](http://www.sphinx-doc.org/) using Atom.

![Sphinx Demo](https://raw.githubusercontent.com/dldl/sphinx-preview/master/docs/demo.gif)

## Installation

Install the Sphinx-Preview Atom package with the following command:

```
apm install sphinx-preview
```

Or via the `Settings View : Install` in Atom.

You also need to install the following dependencies.

## Dependencies

This package needs `Docker` and the `browser-plus` Atom package. It will use
[Sphinx-Server](https://github.com/dldl/sphinx-server) to build the documentation.

### Docker

Install Docker by reading the official documentation : https://docs.docker.com/engine/installation/

### Atom `browser-plus` package

Install the `browser-plus` package by running the following command:

```
apm install browser-plus
```

## Usage

- Open Atom at the root of your documentation.
- Press `ctrl-alt-o` on a `rst` file to open the preview

## How does it work ?

Sphinx-Preview pulls and runs the
[Sphinx-Server](https://hub.docker.com/r/dldl/sphinx-server/). It mounts the
opened project folder. Finally, the package launches a [browser-plus](https://atom.io/packages/browser-plus)
panel on the active `rst` file.
