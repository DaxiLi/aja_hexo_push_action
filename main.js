/**
 * File: mainjs
 * Project: d:\ajarc
 * Created Date: Thursday, July 14th 2022, 6:51:32 pm
 * Author: Aja
 * Last Modified: Saturday, 16th July 2022 12:11:33 am
 * Modified By: 
 * 
 * Describe: 
 * 
 * Copyright (c) 2022 Aja (moogila@outlook.com>)
 * 
 * 000llllllll3 . z Z
 * 
 * -----
 * HISTORY:
 * Date      	By	Comments
 * ----------	---	----------------------------------------------------------
 */

const man = require('./manifest.js');
const qiniu = require('qiniu');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { escape, unescape } = require("querystring");



// argv2 =  bucket  ackey  seckey   uploadFolder  domain   manifest.jsonPath zone
console.log(process.argv);
if (process.argv.length < 5) { console.log("argv length is wrong."); return; }
let bucket = process.argv[2];
let accessKey = process.argv[3];
let secretKey = process.argv[4];
let uploadFolder = process.argv[5];
let domain = process.argv[6];
let zone = process.argv[7]; // 华东	Zone_z0 华北 Zone_z1 华南 Zone_z2 北美 Zone_na0'
let manifestPath = process.argv[8];
let refresh = process.argv[9];



let mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
let config = new qiniu.conf.Config();
uploadFolder = path.resolve(uploadFolder);
if (zone && zone != "") config.zone = qiniu.zone[zone];
if (!domain.endsWith("/")) domain = domain + "/";


function delFile(opts) {

    return new Promise((resolve, reject) => {
        var bucketManager = new qiniu.rs.BucketManager(mac, config);
        bucketManager.batch(opts, function (err, respBody, respInfo) {
            if (err) {
                console.log(err);
            } else {
                if (parseInt(respInfo.statusCode / 100) == 2) {
                    respBody.forEach(function (item) {
                        if (item.code == 200) {
                            console.log(item.code + "\tsuccess");
                            resolve("del " + opts);
                        } else {
                            console.log(item.code + "\t" + item.data.error);
                            reject("del file fail:" + opts);
                        }
                    });
                } else {
                    console.log(respInfo.deleteusCode);
                    console.log(respBody);
                    reject("del file fail:" + opts);
                }
            }
        });
    });
}


function upload(filename, filepath) {
    return new Promise((resolve, reject) => {
        var formUploader = new qiniu.form_up.FormUploader(config);
        var putExtra = new qiniu.form_up.PutExtra();

        let options = {
            scope: bucket + ":" + filename
        }
        var putPolicy = new qiniu.rs.PutPolicy(options);
        var uploadToken = putPolicy.uploadToken(mac);
        formUploader.putFile(uploadToken, filename, filepath, putExtra, function (respErr,
            respBody, respInfo) {
            if (respErr) {
                reject(respErr);
            }
            if (respInfo && respInfo.statusCode == 200) {
                resolve("uploaded: " + filepath);
            } else {
                console.log(respBody);
                reject("upload fail: " + filepath);
            }
        });
    });
}




async function delFileFromQiniu(fileList) {
    console.log("del list is:", fileList);

    var deleteOptions = [];
    var index = 900;
    var idx = 0;
    for (idx in fileList) {
        deleteOptions.push(qiniu.rs.deleteOp(bucket, fileList[idx]));
        if (idx >= index) {
            index += 900;
            await delFile(deleteOptions).then(msg => {
                console.log(msg);
            }).catch(err => {
                console.error(err);
            });
            continue;
        }
    }
    if (index != idx && idx != 0) {
        await delFile(deleteOptions).then(msg => {
            console.log(msg);
        }).catch(err => {
            console.error(err);
        });
    }
    console.log('del files success!');
}

async function uploadFile2Qiniu(fileList) {
    console.time("upload files");
    console.group("info:");
    console.log("upload folder: ", uploadFolder);
    console.log("uploading:")
    console.groupCollapsed("upload files....");
    for (var idx in fileList) {
        let realPath = path.resolve(uploadFolder, fileList[idx]);
        console.log("------------------------");
        console.log("file key:", fileList[idx]);
        console.log("file path: " + realPath);
        await upload(fileList[idx], realPath).then(msg => {
            console.log(msg);
        }).catch(err => {
            console.error(err);
        });
    }
    console.groupEnd();
    console.groupEnd();
    console.timeEnd("upload files");

}


async function updateFile2Qiniu(fileList) {
    console.time("update files");
    console.group("info:");
    console.log("upload folder: ", uploadFolder);
    console.log("uploading:")
    console.groupCollapsed("update files....");
    for (var idx in fileList) {
        let realPath = path.resolve(uploadFolder, fileList[idx]);
        console.log("------------------------");
        console.log("file key:", fileList[idx]);
        console.log("file path: " + realPath);
        await upload(fileList[idx], realPath)
            .then(msg => {
                console.log(msg);
            }).catch(err => {
                console.error(err);
            });
    }
    console.groupEnd();
    console.groupEnd();
    console.timeEnd("update files");
}


async function main() {
    let manPath;
    try {
        manPath = man.generateMeniFest(uploadFolder, path.resolve(uploadFolder, 'manifest.json'));
        console.log("generated menifest.json at:" + manPath);
    } catch (err) {
        console.error(err);
        return -1;
    }
    // let F = fs.readFileSync(manifestPath);
    let addList = [];
    let updateList = [];
    let delList = [];
    if (refresh) {
        console.log("刷新所有文件！");
        var lpath = path.resolve(manPath);
        var rpath = path.resolve(manifestPath);
        try{
            let lf = fs.readFileSync(manPath);
            let lj = JSON.parse(f); 
            addList = man.getFileList(lj);
        } catch(err){
            console.log("读取文件失败，请检查manifest.json");
            return;
        }
        try{
            let rf = fs.readFileSync(manifestPath);
            let rj = JSON.parse(rf);
            delList = man.getFileList(rj);
        }catch(err){
            console.warn("del empty");
        }
    } else {

        let diffRes = man.getDiffObj(manPath, manifestPath);
        addList = diffRes[0] ? man.getFileList(diffRes[0]) : [];
        updateList = diffRes[1] ? man.getFileList(diffRes[1]) : [];
        delList = diffRes[2] ? man.getFileList(diffRes[2]) : [];

    }

    // console.log(diffRes);

    // mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

    await delFileFromQiniu(delList);
    await updateFile2Qiniu(updateList);
    await uploadFile2Qiniu(addList);
    await updateFile2Qiniu(['manifest.json']);

    console.log('update success!');
}



main();

