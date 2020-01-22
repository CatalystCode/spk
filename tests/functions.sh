print_array () {
    #usage: print_array "${my_array[@]}"
    arr=( "$@" )
    for i in "${arr[@]}";
    do
        :
        echo "\t$i"
    done
}
validate_directory () {
    echo "Checking directory $1"
    #Get first arg then shift over to get array arg
    actual_files=( $(find $1 -maxdepth 1 -type f) ); shift
    # actual_files=("$1"/*); shift
    local expected_files=( "$@" ) #"${2[@]}" #("azure-pipelines.yaml" "Dockerfile" )

    # Get the base filenames for comparison
    actual_base_files=()
    for i in "${actual_files[@]}"
    do
        :
        echo "Current file: $i"
        currentFile=$(basename "$i")
        # echo "Current file: $currentFile"
        actual_base_files+=($currentFile)
    done

    if [ ${#actual_files[@]} -ne ${#expected_files[@]} ];then
        echo "File count mismatch";
        echo "Expected ${#expected_files[@]} files but there are ${#actual_files[@]} files"
        exit 1
    fi

    # Comparing arrarys
    difference_array=()
    for i in "${expected_files[@]}"; do
        skip=
        for j in "${actual_base_files[@]}"; do
            [[ $i == $j ]] && { skip=1; break; }
        done
        [[ -n $skip ]] || difference_array+=("$i")
    done
    #declare -p difference_array

    # echo "Size: ${#difference_array[@]}"
    if [ ${#difference_array[@]} -ne 0 ];then
        echo "Found unexpected files in directory..."
        print_array "${difference_array[@]}"
        exit 1
    fi
}

validate_service () {
    echo "Checking directory `$1`"
    local files=( ".gitignore" "azure-pipelines.yaml" "Dockerfile" )
    for i in "${files[@]}"
    do
        :
        currentFile="$1/$i"
        echo "Current file: $currentFile"
        if [ ! -f $currentFile ]; then
            echo "The file `$i` does not exist in directory `$1`"
            exit 1
        fi
    done
}

validate_mono_repo () {
    echo "Checking directory `$1`"
    local files=( ".gitignore" "bedrock.yaml" "maintainers.yaml" )
    for i in "${files[@]}"
    do
        :
        currentFile="$1/$i"
        echo "Current file: $currentFile"
        if [ ! -f $currentFile ]; then
            echo "The file `$i` does not exist in directory `$1`"
            exit 1
        fi
    done
    echo "Not implemented" && exit 1
}

validate_pipeline_creation () {
    #TODO
    echo "Not implemented" && exit 1
}

validate_pull_request () {
    #TODO
    echo "Not implemented" && exit 1
}

function getHostandPath () {
    # extract the protocol
    proto="$(echo $1 | grep :// | sed -e's,^\(.*://\).*,\1,g')"
    # remove the protocol
    url="$(echo ${1/$proto/})"
    # extract the user (if any)
    user="$(echo $url | grep @ | cut -d@ -f1)"
    # extract the host and port
    hostport="$(echo ${url/$user@/} | cut -d/ -f1)"
    # by request host without port
    host="$(echo $hostport | sed -e 's,:.*,,g')"
    # by request - try to extract the port
    port="$(echo $hostport | sed -e 's,^.*:,:,g' -e 's,.*:\([0-9]*\).*,\1,g' -e 's,[^0-9],,g')"
    # extract the path (if any)
    path="$(echo $url | grep / | cut -d/ -f2-)"

    echo "$host/$path"
}


function repo_exists () {
    repo_result=$(az repos list --org $1 -p $2)
    repo_name=$3
    repo_exists=$(echo $repo_result | jq -r --arg repo_name "$repo_name" '.[].name | select(. == $repo_name ) != null')

    if [ "$repo_exists" = "true" ]; then
        echo "The repo '$repo_name' already exists "
        # Get the repo id
        repo_id=$(echo "$repo_result"  | jq -r --arg repo_name "$repo_name" '.[] | select(.name == $repo_name) | .id')
        echo "repo_id to delete is $repo_id"
        # Delete the repo
        az repos delete --id "$repo_id" --yes --org $1 --p $2
    fi
}

function variable_group_exists () {
    vg_result=$(az pipelines variable-group list --org $1 -p $2)
    vg_name=$3
    action=$4
    echo "Checking if the variable group $vg_name exists..."
    vg_exists=$(echo $vg_result | jq -r --arg vg_name "$vg_name" '.[].name | select(. == $vg_name ) != null')

    if [ "$vg_exists" = "true" ]; then
        echo "The variable group '$vg_name' exists "
        if [ "$action" == "delete" ]; then
            # Get the variable group id
            vg_id=$(echo "$vg_result"  | jq -r --arg vg_name "$vg_name" '.[] | select(.name == $vg_name) | .id')
            echo "variable group to delete is $vg_id"
            # Delete the variable group
            az pipelines variable-group delete --id "$vg_id" --yes --org $1 --p $2
        fi
    else
        echo "The variable group $vg_name does not exist"
        if [ "$action" == "fail" ]; then
            exit 1
        fi
    fi
}

function storage_account_exists () {
    sa_name=$1
    rg=$2
    sa_result=$(az storage account list --resource-group $rg)
    sa_exists=$(echo $sa_result | jq -r --arg sa_name "$sa_name" '.[].name | select(. == $sa_name ) != null')
    action=$3
    
    if [ "$sa_exists" = "true" ]; then
        echo "The storage account '$sa_name' exists "
        if [ "$action" == "delete" ]; then
            echo "Delete storage account '$sa_name'"
            az storage account delete -n $sa_name -g $rg --yes
        fi
     else
        echo "The storage account $sa_name does not exist"
        if [ "$action" == "fail" ]; then
            exit 1
        fi
        if [ "$action" == "create" ]; then
            echo "Create storage account '$sa_name'"
            az storage account create -n $sa_name -g $rg
        fi
    fi
}

function storage_account_cors_enabled () {
    sa_name=$1
    action=$2
    cors_enabled_result=$(az storage cors list --services t --account-name $sa_name | jq '.[] | select((.Service=="table") and (.AllowedMethods=="GET") and (.AllowedOrigins=="http://localhost:4040")) != null')

    if [ "$cors_enabled_result" = "true" ]; then
        echo "The storage account '$sa_name' has cors enabled"
    else
        echo "The storage account '$sa_name' does not have cors enabled"
        if [ "$action" == "fail" ]; then
            exit 1
        fi
        if [ "$action" == "enable" ]; then
            echo "Enable cors in storage account '$sa_name'"
            az storage cors add --methods "GET" --origins "http://localhost:4040" --services t --allowed-headers "*" --exposed-headers "*" --account-name $sa_name
        fi
        if [ "$action" == "wait" ]; then
            total_wait_seconds=25
            start=0
            wait_seconds=5
            while [ $start -lt $total_wait_seconds ]; do
                cors_enabled_result=$(az storage cors list --services t --account-name $sa_name | jq '.[] | select((.Service=="table") and (.AllowedMethods=="GET") and (.AllowedOrigins=="http://localhost:4040")) != null')
                if [ "$cors_enabled_result" = "true" ]; then
                    echo "The storage account '$sa_name' has cors enabled"
                    break
                fi
                echo "Wait $wait_seconds seconds..."
                sleep $wait_seconds
                start=$((start + wait_seconds))
            done
            if [ "$cors_enabled_result" != "true" ]; then
                echo "The storage account '$sa_name' does not have cors enabled"
                exit 1
            fi
        fi
    fi
}

function storage_account_table_exists () {
    t=$1
    sa_name=$2
    action=$3
    sat_result=$(az storage table exists -n $t --account-name $sa_name)
    sat_exists=$(echo $sat_result | jq '.exists | . == true')

    if [ "$sat_exists" = "true" ]; then
        echo "The table '$t' exists "
     else
        echo "The table $sa_name does not exist"
        if [ "$action" == "fail" ]; then
            exit 1
        fi
        if [ "$action" == "create" ]; then
            echo "Create table $t"
            az storage table create -n $t --account-name $sa_name
        fi
    fi
}

function pipeline_exists () {
    echo "Checking if pipeline: ${3} already exists."
    pipeline_results=$(az pipelines list --org $1 --p $2)
    pipeline_exists=$(tr '"\""' '"\\"' <<< "$pipeline_results" | jq -r --arg pipeline_name ${3} '.[].name  | select(. == $pipeline_name ) != null')
    if [ "$pipeline_exists" = "true" ]; then
        echo "The pipeline '${3}' already exists."
        # Get the pipeline id. We have to replace single "\" with "\\"
        pipeline_id=$(tr '"\""' '"\\"' <<<"$pipeline_results"  | jq -r --arg pipeline_name ${3} '.[] | select(.name == $pipeline_name) | .id')
        echo "pipeline_id to delete is $pipeline_id"
        # Delete the repo
        az pipelines delete --id "$pipeline_id" --yes --org $1 --p $2
    fi
}

function variable_group_variable_create () {
    id=$1
    org=$2
    p=$3
    n=$4
    v=$5
    s=$6
    
    echo "Create variable '$v' in variable group"
    if [ $s == "secret" ]; then
        result=$(az pipelines variable-group variable create --id $id --org $org -p $p --name $n --value $v --secret)
    else
        result=$(az pipelines variable-group variable create --id $id --org $org -p $p --name $n --value $v)
    fi
}

function variable_group_variable_exists () {
    id=$1
    org=$2
    p=$3
    v=$4
    action=$5
    query="'.$v != null'"
    exists=$(az pipelines variable-group variable list --id $id --org $org -p $p | jq $query)

    if [ "$exists" = "false" ]; then
        echo "Variable '$v' does not exist in variable group"
        if [ "$action" = "fail" ]; then
            exit 1
        fi
    fi
}

function verify_pipeline_with_poll () {
    local pipeline_name=$3
    poll_timeout=$4
    poll_interval=$5
    end=$((SECONDS+$poll_timeout))
    loop_result="unknown"

    echo "Attempting to verify that the pipeline build for $pipeline_name is successful..."
    pipeline_result=$(az pipelines build definition show --name $pipeline_name --org $AZDO_ORG_URL --p $AZDO_PROJECT)
    pipeline_id=$(tr '"\""' '"\\"' <<< "$pipeline_result" | jq .id)
    echo "$pipeline_name has pipeline id of $pipeline_id"

    while [ $SECONDS -lt $end ]; do
        pipeline_builds=$(az pipelines build list --definition-ids $pipeline_id --org $1 --p $2)

        # We expect only 1 build right now
        build_count=$(tr '"\""' '"\\"' <<< "$pipeline_builds" | jq '. | length')
        if [ "$build_count" != "1"  ]; then
            echo "Expected 1 build for pipeline: $pipeline_name-$pipeline_id but found $build_count"
            exit 1
        fi

        # We use grep because of string matching issues
        echo "Get the build status for build..."
        pipeline_status=$(tr '"\""' '"\\"' <<< "$pipeline_builds" | jq .[0].status)
        echo "pipeline: $pipeline_name-$pipeline_id:"
        echo "pipeline_status this iteration --> $pipeline_status"
        if [ "$(echo $pipeline_status | grep 'completed')" != "" ]; then
            pipeline_result=$(tr '"\""' '"\\"' <<< "$pipeline_builds" | jq .[0].result)
            if [ "$(echo $pipeline_result | grep 'succeeded')" != "" ]; then
                echo "Successful build for pipeline: $pipeline_name-$pipeline_id!"
                loop_result=$pipeline_result
                break
            else
                echo "Expected successful build for pipeline: $pipeline_name-$pipeline_id but result is $pipeline_result"
                exit 1
            fi
        else
        echo "pipeline: $pipeline_name-$pipeline_id status is $pipeline_status. Sleeping for $poll_interval seconds"
        sleep $poll_interval
        fi
    done
    if [ "$loop_result" = "unknown" ]; then
        echo "Polling pipeline: $pipeline_name-$pipeline_id timed out after $poll_timeout seconds!"
        exit 1
    fi
}

function approve_pull_request () {
    all_prs=$(az repos pr list --org $1 --p $2)
    pr_title=$3

    pr_exists=$(echo $all_prs | jq -r --arg pr_title "$pr_title" '.[] | select(.title == $pr_title) != null')
    if [ "$pr_exists" != "true" ]; then
        echo "PR for '$pr_title' not found"
        exit 1
    fi
    pull_request_id=$(echo $all_prs | jq -r --arg pr_title "$pr_title" '.[] | select(.title == $pr_title) | .pullRequestId')
    echo "Found pull request id $pull_request_id for '$pr_title'"
    approve_result=$(az repos pr update --id "$pull_request_id" --auto-complete true --output json )

    if [ "$(echo $approve_result | jq '.mergeStatus' | grep 'succeeded')" != "" ]; then
        echo "PR $pull_request_id approved"
    else
        echo "Issue approving PR $pull_request_id"
        exit 1
    fi
}

function validate_file () {
    echo "Validatng file $1"
    if grep -q "$2" "$1";
    then
        echo "File contents have been successfully validated in $1"
    else
        echo "Issue validating file content with provided content in $1"
        exit 1
    fi
}
