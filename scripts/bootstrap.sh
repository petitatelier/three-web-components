set -e
npm_bin_dir=`npm bin`

${npm_bin_dir}/lerna bootstrap --hoist
${npm_bin_dir}/lerna clean --yes

packages=(`find packages -name "package.json" -maxdepth 2 | xargs -I '{}' dirname '{}'`)

for package in ${packages[@]}; do
  npmname=`node -e "console.log(require(\"${INIT_CWD}/${package}/package.json\").name)"`
  if [ ! -L ${INIT_CWD}/node_modules/${npmname} ]; then
    source="${INIT_CWD}/${package}"
    target="${INIT_CWD}/node_modules/${npmname}"
    mkdir -p `dirname "$target"`
    ln -sfv ${source} ${target}
  fi
done