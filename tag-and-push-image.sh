

#!/bin/bash

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -t|--tag)
    TAG="$2"
    shift # past argument
    shift # past value
    ;;
    -i|--image)
    IMAGE="$2"
    shift # past argument
    shift # past value
    ;;
    -r|--repo)
    REPO="$2"
    shift # past argument
    shift # past value
    ;;
    --default)
    DEFAULT=YES
    shift # past argument
    ;;
    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

echo $#
echo TAG    = "${TAG}"
echo IMAGE  = "${IMAGE}"
echo REPO   = "${REPO}"

if [[ $TAG == "" ]] || [[ $IMAGE == "" ]] || [[ $REPO == "" ]] ; then
    echo './tag-and-push-image.sh -t <tag> -i <image> -r <repo>'
    exit 0
fi



docker tag $IMAGE $REPO:$TAG
docker push $REPO:$TAG
