# aja_hexo_push_action
自动将 hexo 博客推送至七牛云

七牛云免费的 10GB 空间和流量拥有不错的速度，并且可以设置使用 index.html 作为默认首页
我们可以很容易将静态博客放到七牛云上

每次手动上传时很麻烦的，所以，可以利用 github 自动任务在我们每次更新博客仓库时，自动上传。


# 开始使用

为了本地管理时，更为清爽方便，我们需要在 GitHub 拥有两个仓库，一个是本仓库，负责七牛云推送，一个仓库存储您的博可文章。无所谓公开或私密。当然，你可以 将所有文件都放在一个仓库里，这样更简单，不过，你就不得不在你的博文目录里面看到一大堆项目文件。

首先 Fork 本仓库,您的目录应该是这样的

```bash
├── .git
├── .github
├── hexo
├── README.md
├── action.yml
├── config.js
├── main.js
├── manifest.js
├── package-lock.json
├── package.json

```

然后再创建一个存储博客的仓库，我们称塔为 bolg-rep，稍后我们会将这个仓库作为子模块引入本仓库。


## 1.创建一个七牛空间

去 qiniu.com 注册一个账号。在控制台中，转到 “对象存储Kodo” > “空间管理” ，然后单击“创建”。

填写空间名称，这个空间名称就是 bucket ，选择一个位置（根据这个位置选择 zone 。访问控制选择“公有”

进入 “空间管理” ，打开 “默认首页设置”

进入 “域名管理” 绑定自己的域名 


## 2.获取和配置密钥

在七牛控制台中点击右上角的头像>“密钥管理”，两个密钥对，随便选择一对。

打开 Github 仓库的 seeting > Secrets > Actions
点击 New repository secret 新建一个密钥
name 填 QINIU_ACCESS_KEY ，Value 填 七牛云的 AK
再新建一个密钥
name 填 QINIU_SECRECT_KEY ，Value 填 七牛云的 SK


## 3.创建 workerflow

创建打开 .github/workerflows/autopush.yml 复制并编辑写入以下配置

```yml
name: push hexo to qiniu automatic
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 1
        path: main
        submodules: true
    - uses: actions/setup-node@v2
      with:
        node-version: 16.x
    - uses: DaxiLi/aja_hexo_push_action@v1
      with:
        bucket: your bucket name
        access-key: ${{ secrets.QINIU_ACCESS_KEY }}
        secret-key: ${{ secrets.QINIU_SECRET_KEY }}
        public-folder: the hexo public folder 
        hexo-folder: the folder of hexo
        domain: "http://example.com"
        manifest-filepath: "manifest.jaon"
        qiniu-zone: your qiniu zone tag

```

+ bucket：你的七牛 bucket
+ access-key：不要改动
+ secrect-key：不要改动
+ public-folder：hexo 生成的博客目录，默认是 public
+ hexo-folder：初始化 hexo 所在目录
+ domain：你的七牛空间绑定域名
+ manifest-filepath: 无需改动
+ qiniu-zone：七牛空间所在地区设置 华东	Zone_z0 华北	Zone_z1 华南	Zone_z2 北美	Zone_na0
+ bolg-repository：你的博客仓库，这个仓库专门存放博客 markdown 文件，对应 hexo 目录下的 source 目录。



## 4.初始化 hexo 目录

在项目目录下新建一个目录作为 hexo 的工作目录，（这个目录对应上面配置文件的 hexo-folder ）

```bash
mkdir [your hexo-folder]
hexo init [your hexo-folder]
```
上面的指令将会创建一个 your hexo-folder 目录，并在目录下初始化一个 hexo 项目

**本项目默认已经初始化在 hexo 文件夹，所以您也可以忽略此步骤，在 .github/workerflows/autopush.yml 中将 hexo-folder 填写为 hexo**

如果您还没有安装 hexo，

```bash
npm i -g hexo-cli
``` 
或参阅 [hexo 官方网站](https://hexo.io/zh-cn/docs/)


## 5.将你的博客文章仓库作为 git 子模块引入

[前面](#开始使用)，我们说到，您新建了一个博客文章仓库用来更好的管理文章。我们暂且用 blog-rep 来指代它。

当然，您可以忽略此步骤，您只需要像正常使用 hexo 一样，将所有文章都放在 hex-folder 下的 source 目录里即可。


```bash

rm -r [your-hexo-folder/source] 
# 将原有的source目录删除
git submodule add [your-blog-rep] [your-hexo-folder]/source
# 将你的博客仓库作为子模块添加进来

```


## theme

您应该还希望在 hexo 中使用主题

如果您的主题支持作为子模块管理，则可以参照主题说明将，主题再作为子模块添加在 your-hex-folder 中。

如果，您的主题不支持作为子模块管理，或者您不知道怎么做，那么将它像正常主题一样放到仓库的主题目录下，并将他添加到 git 的版本控制中。


## 