# revise the github automation to build for WardCunningham
# usage: sh be-ward.sh

perl -pi.bak -e 's/\$\{\{ *github.repository *\}\}/wardcunningham\seran-wiki/g' .github/workflows/dockerimage.yml