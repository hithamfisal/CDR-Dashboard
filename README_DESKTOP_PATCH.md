# Desktop Patch Files

Copy the contents of this folder into the root of your dashboard project, the same folder that contains `package.json`. Then run:

```powershell
node apply-desktop-patch.cjs
yarn install
yarn desktop:dev
```

If you want the installer after testing:

```powershell
yarn desktop:dist
```

The Windows setup EXE will be generated in the `release` folder.
