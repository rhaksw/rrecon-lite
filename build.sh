#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
DIST="${DIR}"/dist
DEST="${DIST}"/chrome
rm -rf "${DEST}"
mkdir -p "${DIST}"
cp -R "${DIR}"/chrome "${DEST}"

(cd $DIR
yarn run build


for css in $(find chrome -type f -name '*css'); do
  postcss "$css" > "${DIST}"/"$css"
done

)
rm "${DEST}"/src/common.js

