const depcheck = require('depcheck');
const resolvePackagePath = require('resolve-package-path');

const path = require('path');
const fs = require('fs');
const dir = process.argv[2] || process.cwd();

const pkg = require(path.join(dir, 'package.json'));
console.log(`Checking dependencies in ${pkg.name} (${dir})\n\n`);

depcheck(dir, { package: pkg })
  .then((results) => {
    const toInstall = {};
    const missing = [];

    if (Object.keys(results.missing).length === 0) {
      console.log('No missing dependencies');
      return;
    }

    Object.entries(results.missing).forEach(([dep, paths]) => {
      try {
        const depPkgPath = findPackagePath(dep, paths);
        if (!depPkgPath) {
          missing.push(dep);
          return;
        }

        const depPkg = require(depPkgPath);
        toInstall[dep] = depPkg.version;
      } catch {
        missing.push(dep);
      }
    });

    if (Object.keys(toInstall).length > 0) {
      updatePackageJson(toInstall);
      console.log('=====\nUpdated package.json dependencies');
      console.log(JSON.stringify(toInstall, null, 2));
      console.log('=====\n');
    }

    if (missing.length > 0) {
      console.log('Could not find versions for missing dependencies:');
      console.log(missing.join(' '));
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

function findPackagePath(dep, paths) {
  for (const path of paths) {
    try {
      return resolvePackagePath(dep, path);
    } catch {
      // do nothing
    }
  }

  return null;
}

function updatePackageJson(toInstall) {
  pkg.dependencies = { ...pkg.dependencies, ...toInstall };
  // sort dependencies alphabetically
  pkg.dependencies = Object.keys(pkg.dependencies)
    .sort()
    .reduce((acc, key) => {
      acc[key] = pkg.dependencies[key];
      return acc;
    }, {});

  const packageJsonPath = path.join(dir, 'package.json');
  const indent = getPackageJsonIndent(packageJsonPath);

  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, indent));
}

function getPackageJsonIndent(path) {
  const packageJsonString = fs.readFileSync(path, 'utf8');
  const lines = packageJsonString.split('\n');
  const indentedLine = lines.find((line) => /^\s/.test(line));
  if (indentedLine) {
    return indentedLine.match(/^(\s+)/)[0];
  }
  return '  ';
}
