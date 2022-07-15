# aja_hexo_push_action
自动将 hexo 博客推送至七牛云

[hexo to qiniu](https://github.com/DaxiLi/aja_hexo_push_action)

七牛云免费的 10GB 空间和流量拥有不错的速度，并且可以设置使用 index.html 作为默认首页
我们可以很容易将静态博客放到七牛云上

每次手动上传时很麻烦的，所以，可以利用 github 自动任务在我们每次更新博客仓库时，自动上传。


# 开始使用


创建一个仓库管理你的博客文章，这个仓库的目录结构应该和 hexo 目录下的 source 目录是一样的，在处理时，您的整个仓库将被当作 hexo 目录下的 source 目录来生成静态文件。
所以，您的博客管理仓库的目录应该类似于这个样子

```bash

├── .git
├── .github
├── _data
├── _post
├── categories
├── galleries
├── tags

```

您的文章应当放在 _post 目录下


在开始配置之前，你需要准备好七牛云账号。



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

name: push autoatic
on: [push]

jobs:
  autopush_job:
    runs-on: ubuntu-latest
    steps:
     - name: running..
       uses: DaxiLi/aja_hexo_push_action@v1
       with:
         bucket: your-bucket
         access-key: ${{ secrets.QINIU_ACCESS_KEY }}
         secret-key: ${{ secrets.QINIU_SECRET_KEY }}
         hexo-cli-version: your-hexo-version
         domain: your-domain
         hexo-config-path: your-config-path(maybe you will put the config file in _data/_config.yml)
         theme-config-path: your-theme-config-path(maybe _data/_theme.yml)
         theme-repository: your-theme-repository
         qiniu-zone: your-qiniu-zone
         theme-name: your-theme-name
         refresh-on: "no"


```

+ bucket：你的七牛 bucket
+ access-key：不要改动
+ secrect-key：不要改动
+ domain：你的七牛空间绑定域名
+ qiniu-zone：七牛空间所在地区设置 华东	Zone_z0 华北	Zone_z1 华南	Zone_z2 北美	Zone_na0
+ theme-repository：你的主题所在的仓库，格式为 仓库所有者/仓库名称@label。例如： DaxiLi/beauty@v1
+ theme-name：主题文件夹的名字，通常需要在站点配置文件中填写
+ theme-config-path：你的主题配置文件路径，你可以把主题配置文件放在 _data 目录先，所以它可以是 _data/theme.yml
+ hexo-config-path：hexo 站点的配置文件，你可以把站点配置文件放在 _data 目录先，所以它可以是 _data/theme.yml
  


## 创建手动运行 action

有时候，你可能需要手动运行，并且更新全部文件，这个时候，所以还需要添加一个 wokeflows 

创建 .github/workerflows/autopush.yml 写入以下内容

```yml


name: push autoatic
on: [push]

jobs:
  autopush_job:
    runs-on: ubuntu-latest
    steps:
     - name: running..
       uses: DaxiLi/aja_hexo_push_action@v1
       with:
         bucket: your-bucket
         access-key: ${{ secrets.QINIU_ACCESS_KEY }}
         secret-key: ${{ secrets.QINIU_SECRET_KEY }}
         hexo-cli-version: your-hexo-version
         domain: your-domain
         hexo-config-path: your-config-path(maybe you will put the config file in _data/_config.yml)
         theme-config-path: your-theme-config-path(maybe _data/_theme.yml)
         theme-repository: your-theme-repository
         qiniu-zone: your-qiniu-zone
         theme-name: your-theme-name
         refresh-on: "yes"

```

填写好配置之后，推送到仓库，你可以在 action 看到一个按钮手动运行该  action  即可推送仓库至 七牛云。


## enjoy it！

现在，每次更新你的博客仓库，它都会自动推送到你的七牛云