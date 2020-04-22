# revise the github automation to build for other than WardCunningham
# usage: sh be-other.sh

perl -pi.bak -e 's/wardcunningham/${{ github.repository }}/g' .github/workflows/dockerimage.yml