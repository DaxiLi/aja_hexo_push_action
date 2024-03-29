#!/bin/bash

set -e;

# rm -rf qshell
# mkdir qshell;
unzip ./tool/qshell.zip -d ./;
chmod +x ./qshell;

echo "start ...";
./qshell account -L -w -- $access_key $secret_key uone;
echo "set account";
./qshell -L user cu uone;


# 必须非 / 开头 / 结尾
if [ ! -z $sub_dir ];then
    if [[ ! $sub_dir =~ .*/$ ]];then
	echo "";
        sub_dir="$sub_dir/"
    fi
    len=${#sub_dir};
    if [[ $sub_dir =~ ^/.* ]];then
        sub_dir=${sub_dir:1:len};
    fi
    echo "use prefix key: $sub_dir";
fi


# 获取本地 public 所有文件列表
./qshell -L dircache $upload_dir -o local-public.txt 
# 生成 sub_dir 前缀列表，如果 sub_dir 未定义，则不影响
awk -F '\t' '{print "'''$sub_dir'''"$1}' local-public.txt > local-public.clear



# 列举空间中的所有文件列表
./qshell -L listbucket2   \
    $bucket \
    $( if [ ! -z $sub_dir ];then echo "--prefix  $sub_dir";fi ) \
    -o $bucket-all.txt;
# 生成干净列表
awk '{print $1}' $bucket-all.txt > $bucket-all.clear;



# 排序
sort local-public.clear > local-public-sort.clear
sort $bucket-all.clear > $bucket-all-sort.clear
# 获取 bucket 中有，本地没有的文件列表
comm -1 -3 local-public-sort.clear $bucket-all-sort.clear > del-list.txt



###############################################################
# 直接上传文件夹覆盖同步
# ./qshell 会自动比较文件是否相同，相同则不上传，但是，这个过程似乎有点慢
# 不如原来的方案，考虑，自己生成 etag ，自己比较 

UPLOAD() {
    echo "start upload files in $upload_dir";
    echo '' > $2;
    echo '' > $3;
    echo '' > $4;
    ./qshell qupload2 -L \
        --src-dir=$upload_dir \
        --bucket=$bucket \
        --file-list=$1 \
        --success-list=$2 \
        --overwrite-list=$3 \
        --failure-list=$4 \
        --skip-path-prefixes=$skip_path_prefixes \
        --skip-file-prefixes=$skip_file_prefixes \
        --skip-suffixes=$skip_suffixes \
        --skip-fixed-strings=$skip_fixed_strings \
        --log-file=log.log \
        --log-level=$(if [ "$debug" == "debug" ];then echo "debug";else echo "info";fi) \
        $(if [ ! -z $sub_dir ];then echo "--key-prefix=$sub_dir";fi) \
        --overwrite=true \
        --thread-count=$thread_count \
        $(if ( "$check_exists" == "true" );then
            echo "--check-exists=$check_exists " 
            if ( [ ! -z $check_hash ] && "$check_hash" == "true" );then
                echo "--check-hash=true ";
            else
                echo "--check-size=true ";
            fi
        else
            echo "--check-exists=false ";
        fi
        )
    
    if [ "$debug" == "debug" ];then
        echo "logs:";
        cat log.log;
    fi
    echo "----------------------------------------------------------"
    echo "-------------- these files upload succeed! ---------------";
    cat $2;
    
    echo "----------------------------------------------------------"
    echo "-------------- these file was overwrite! -----------------";
    cat $3; 
    res=$(cat $4 | sed $'s/\"/\\"/g' );
    echo "----------------------------------------------------------"
    if [ -z $res ];then
        echo "------------- no file upload fail! ----------------------";
        echo "---- every thing is ok, deleting the old files.... ------";
        return 0;
    else
        echo "-------------- these files upload fail! -----------------";
        cat $4
        return 1;
    fi
}


DEL(){
    if [ "$delete_unuse_files" != "true" ];then
        echo "dont delete files! skip !";
        return 0;
    fi
    ./qshell -L batchdelete --force \
    $bucket \
    --input-file=$1 \
    --success-list=$2 \
    --failure-list=$3 
    
    res=$(cat $3 | sed $'s/\"/\\"/g');
    echo "----------------------------------------------------------";
    if [ -z "$res" ];then
        cat $2;
        echo "-------------- delete files finished! ----------------";
        return 0;
    else
        echo "--------------- these files delete fail! -------------";
        cat $3;
        return 1;
    fi
}



REFRESHCND(){
    if [ -z $refresh_cdn ];then
        return
    fi
    if [ -z $domain_url ];then
        echo "--------- WARNING --------";
        echo "you enable fresh cdn,but you did not input a domain url";
        echo "skip refreshing.....";
    fi
    if [[ ! $domain_url =~ .*/$ ]];then
        domain_url="$domain_url/"
    fi
    if [[ ! $domain_url =~ ^http://.* ]];then
            http_flag = 'true';
    fi
    if [[ ! $domain_url =~ ^https://.* ]];then
            if [ ! -z $http_flag ];then
                echo "domain url must start with http(s)://";
                return;
            fi
    fi
    res=$(cat $1 | sed $'s/\"/\\"/g');
    if [ -z "$res" ];then
        echo "nothing need refresh..";
        return
    fi
    awk -F '\t' '{print "'''$domain_url$sub_dir'''"$1}' $1 > refresh.txt
    echo "----------------------------------------------------------"
    echo "-------refresh these files links:--------";
    cat refresh.txt
    echo "----------------------------------------------------------"
    ./qshell -L \
        cdnrefresh -i refresh.txt
    echo '' > $1;
}


if ! UPLOAD local-public.txt succeed.txt write.txt fail.txt ;then
    REFRESHCND write.txt
    echo "----------------------------------------------------------"
    echo "------------ retry again....---------";
    if ! UPLOAD fail.txt success.txt write.txt fail0x1.txt ;then
        REFRESHCND write.txt
        echo "----------------------------------------------------------"
        echo "----------- last retry.... ----------";
        if ! UPLOAD fail0x1.txt success.txt write.txt fail0x2.txt ;then    
            REFRESHCND write.txt
            echo "----------------------------------------------------------"
            echo "-------- skip these files --------";
        fi
    fi
fi

REFRESHCND write.txt

if ! DEL del-list.txt del-succeed.txt del-fail.txt; then
    REFRESHCND write.txt
    echo "----------------------------------------------------------"
    echo "------------ retry again....---------";
    if ! DEL del-fail.txt del-succeed.txt del-fail0x1.txt ;then
        REFRESHCND write.txt
        echo "----------------------------------------------------------"
        echo "----------- last retry.... ----------";
        if ! DEL del-fail0x1.txt del-succeed.txt del-fail0x2.txt ;then  
            REFRESHCND write.txt
            echo "----------------------------------------------------------"
            echo "-------- skip these files --------";
        fi
    fi
fi

