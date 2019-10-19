git clone https://github.com/microsoft/spektate.git
cd spektate/pipeline-scripts

sudo /usr/bin/easy_install virtualenv
pip install virtualenv 
pip install --upgrade pip
python -m virtualenv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

commitId=$6
commitId=$(echo "${commitId:0:7}")
echo "python update_pipeline.py $1 $2 $3 $4 $5 $6 $7 $8"
python update_pipeline.py $1 $2 $3 $4 $5 $6 $7 $8
