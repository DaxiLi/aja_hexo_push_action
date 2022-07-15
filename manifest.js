/**
 * File: .github\manifest.js
 * Project: d:\ajarc
 * Created Date: Thursday, July 14th 2022, 2:02:12 pm
 * Author: Aja
 * Last Modified: Friday, 15th July 2022 9:37:47 pm
 * Modified By: 
 * 
 * Describe: 在目录下生成 manifest.json
 * 包含该目录下所有文件的 hash 值和文件大小，以方便校验文件是否更改
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
const fs = require("fs");
const path = require("path");
const os = require('os');
const crypto = require('crypto');
const { escape, unescape } = require("querystring");
let platform = os.platform();

const OUTNAME = "manifest.json"
const SPLITCHAR = "/";


getFileList = function (J) {
    console.info("getFileList: ", J);
    let res = [
        "manifest.json"
    ];
    processFileList(J, res, "");
    return res;
}


function processFileList(vJson, vList, vPath) {
    for (let key in vJson) {
        if (vJson[key] === true) {
            // pass isDir;
            continue;
        }
        if (vJson[key].isDir) {
            processFileList(vJson[key], vList, vPath + key + SPLITCHAR);
        } else {
            vList.push(vPath + key)
        }
    }
    return;
}


/**
 * 
 * @param {待比较的文件} maniFileL 
 * @param {需要比较的文件} maniFileR 
 * 返回两个 对象 ，一个是改动文件，一个是更新文件,一个是删除文件
 */
let getDiffObj = function (maniFileL, maniFileR) {
    if (!maniFileL && !maniFileR) {
        throw Error("invalied input!");
    }
    if (maniFileR == "") {
        console.log("get diff Obj, the R ?  return L ");
        return [JSON.parse(fs.readFileSync(maniFileL)), false, false];
    }
    let L = path.resolve(maniFileL);
    let R = path.resolve(maniFileR);
    let fl = fs.readFileSync(L);
    let fr = fs.readFileSync(R);
    let jsonL;
    let jsonR;
    try {
        jsonL = JSON.parse(fl);
    } catch (err) {
        console.error(err);
        return [false, false, false];
    }
    try {
        jsonR = JSON.parse(fr);
    } catch (err){
        console.error("read file err:", err);
        return [jsonL, false, false]
    }
    return getDiff(jsonL, jsonR);

}


function getDiff(L, R) {
    let resAdd = {

    }
    let resUpdate = {

    }
    let resDel = {

    }
    for (let key in L) {
        if (R[key]) {
            if (L[key].isDir && R[key].isDir) {
                let r = getDiff(L[key], R[key]);
                if (r[0]) { resAdd[key] = r[0]; }
                if (r[1]) { resUpdate[key] = r[1]; }
                if (r[2]) { resDel[key] = r[2]; }
                continue;
            } else if (L[key].isDir || R[key].isDir) {
                resDel[key] = R[key];
                resAdd[key] = L[key];
            } else if (L[key].md5 != R[key].md5 || L[key].size != R[key].size) {
                resUpdate[key] = L[key];
            } else {
                // do nothing 
                continue;
            }
        } else {
            resAdd[key] = L[key];
        }
    }

    for (let key in R) {
        if (!L[key]) {
            resDel[key] = R[key];
        }
    }
    if (JSON.stringify(resAdd) == '{}') resAdd = false; else resAdd.isDir = true;
    if (JSON.stringify(resUpdate) == '{}') resUpdate = false; else resUpdate.isDir = true;
    if (JSON.stringify(resDel) == '{}') resDel = false; else resDel.isDir = true;
    return [resAdd, resUpdate, resDel];
}


let processDir = function (dir) {
    const res = {
        isDir: true
    }
    try {
        fs.accessSync(dir, fs.constants.R_OK);
    } catch (err) {
        console.error(dir + ": cannot access! skip it !");
        return res;
    }

    let files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
        // files[i] = escape(files[i]);
        tmp_path = path.resolve(dir, files[i]);
        if (fs.statSync(tmp_path).isDirectory()) {
            const r = processDir(tmp_path);
            res[files[i]] = r;
        } else {
            let f;
            try {
                f = fs.readFileSync(tmp_path);
            } catch (err) {
                console.error("can not read file:" + tmp_path + " skip it!");
                console.log(err);
                continue;
            }
            const hash_md5 = crypto.createHash('md5');
            hash_md5.update(f, "utf8");
            const md5 = hash_md5.digest('hex');
            res[files[i]] = {
                isDir: false,
                md5: md5,
                fsize: fs.statSync(tmp_path).size
            }
        }
    }
    return res;
}


/**
 * 
 * @param {check path} dir 
 * @param {the manifest.json out path} outfile 
 */
let generateMeniFest = function (dir = "", outfile = "") {
    console.time("generate manifest.json");
    if (!dir || dir == "") {
        dir = process.cwd;
        console.warn("you do not input the file path, use pwd as a default path!");
    }
    dir = path.resolve(dir);
    if (!fs.statSync(dir).isDirectory()) throw Error(dir + "is not a directory!");
    try {
        fs.accessSync(dir, fs.constants.R_OK);
        console.info(dir + " can be read!");
    } catch (err) {
        throw Error(dir + " can not be read!" + err);
    }

    if (!outfile || outfile == "") { // 没有输入文件名
        outfile = path.resolve(dir, OUTNAME);
    }
    if (!fs.existsSync(path.dirname(outfile))) {
        throw Error(outfile + ": do not exist!");
    }

    try {
        fs.accessSync(path.dirname(outfile), fs.constants.W_OK | fs.constants.R_OK);
        console.info(path.dirname(outfile) + " can be read and write!");
    } catch (err) {
        console.info(path.dirname(outfile) + " cant not read or write! " + err);
    }


    let r = processDir(dir);
    try {
        fs.writeFileSync(outfile, JSON.stringify(r));
    } catch (err) {
        console.error("write file err:" + err);
    }
    console.info("the menifest.json of " + dir + "is:");
    console.groupCollapsed();
    console.log(JSON.stringify(r, space = 4));
    console.groupEnd();
    console.timeEnd("generate manifest.json");
    return outfile;
}


module.exports = {
    generateMeniFest,
    getDiffObj,
    getFileList
}
