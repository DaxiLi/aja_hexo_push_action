# aja_hexo_push_action
自动将 hexo 博客推送至七牛云

[hexo to qiniu](https://github.com/DaxiLi/aja_hexo_push_action)

七牛云免费的 10GB 空间和流量拥有不错的速度，并且可以设置使用 index.html 作为默认首页
我们可以很容易将静态博客放到七牛云上

每次手动上传时很麻烦的，所以，可以利用 github 自动任务在我们每次更新博客仓库时，自动上传。


# 开始使用


## 1.创建一个仓库管理你的博客文章

这个仓库的目录结构应该和 hexo 目录下的 source 目录是一样的，在处理时，您的整个仓库将被当作 hexo 目录下的 source 目录来生成静态文件。

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



## 2.创建一个七牛空间


请创建一个单独的七牛云空间专门用来保存博客，因为每次刷新博客，都会清除这个空间里面不属于 hexo 的其他文件
---

去 qiniu.com 注册一个账号。在控制台中，转到 “对象存储Kodo” > “空间管理” ，然后单击“创建”。

填写空间名称，这个空间名称就是 bucket ，选择一个位置（根据这个位置选择 zone 。访问控制选择“公有”

进入 “空间管理” ，打开 “默认首页设置”

进入 “域名管理” 绑定自己的域名 



## 3.获取和配置密钥

在七牛控制台中点击右上角的头像>“密钥管理”，两个密钥对，随便选择一对。

打开 Github 仓库的 seeting > Secrets > Actions
点击 New repository secret 新建一个密钥
name 填 QINIU_ACCESS_KEY ，Value 填 七牛云的 AK
再新建一个密钥
name 填 QINIU_SECRECT_KEY ，Value 填 七牛云的 SK


## 4.创建 workerflow

创建打开 .github/workerflows/autopush.yml 复制并编辑写入以下配置

```yml

name: push autoatic
on: [push, workflow_dispatch]

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
          hexo-config-path: your-config-path(maybe you will put the config file in _data/_config.yml)
          theme-config-path: your-theme-config-path(maybe _data/_theme.yml)
          theme-repository: your-theme-repository
          theme-name: your-theme-name
          package-file: your-package.json(_data/package.json)
          package-lock-file: your-package-lock.json(_data/package-lock.json)


```

+ bucket：你的七牛 bucket
+ access-key：不要改动
+ secrect-key：不要改动
+ theme-repository：你的主题所在的仓库，格式为 仓库所有者/仓库名称@label。例如： DaxiLi/beauty@v1
+ theme-name：主题文件夹的名字，通常需要在站点配置文件中填写
+ theme-config-path：你的主题配置文件路径，你可以把主题配置文件放在 _data 目录先，所以它可以是 _data/theme.yml
+ hexo-config-path：hexo 站点的配置文件，你可以把站点配置文件放在 _data 目录先，所以它可以是 _data/theme.yml
+ package.json 你自己的hexo的依赖，（可能需要安装一些扩展，）
+ package-lock.json 目的同上


上面就是一个一般配置，能够满足一般使用情况。

如果你不使用主题，那么删除 `theme-config-path` `theme-repository` `theme-name` 选项

如果你不使用任何第三方插件，那么删除 `package-file` `package-lock-file` 

除此之外，还有其他配置选项可用

```yml
  
  hexo-cli-version: 4.3.0
  sub-dir: ""
  upload-dir: "hexo/public"
  thread-count: 8
  check-hash: true
  check-exists: true
  skip-path-prefixes: ""
  skip-file-prefixes: "" 
  skip-suffixes: ""
  skip-fixed-strings: ""
  debug: no
  delete-unuse-files: true
```

+ hexo-cli-version: hexo cli 的版本，默认 4.3.0
  
+ sub-dir: 七牛云子目录名称。如果 sub-dir=blog 那么您的博客文件将上传到七牛云的 blog 文件夹，您将通过 your-domain/blog 来访问 
  
+ upload-dir: 这是项目中hexo生成的静态文件的相对目录，一般不需要填写，保持默认，除非您在hexo配置文件中修改了此项，默认值为 "hexo/public"
  
+ thread-count: 上传时使用的线程数，默认为 8


+ check-hash: 上传文件时，是否通过 hash 值来比较本地文件和云端文件，默认为 true ，只有在 `check-exists` 为 true 时该项生效，如果为 false ，且开启了 `check-exists` ，那么将使用比较文件大小的方式来确认文件是否相同  


+ check-exists: 是否检查云端文件是否与本地文件相同，默认为 true 。如果 false ，那么每次都会刷新全部文件至七牛云


+ skip-path-prefixes: 路径名以此为前缀的文件都不会被上传，默认为空。多个值之间使用 `,` 分割, eg."prefix1, prefix2" , 那 prefex1 和 prefix2 开头的目录都不会被上传


+ skip-file-prefixes: 文件名以此为前缀的文件不会被上传，默认为空。多个值之间使用 `,` 分割, eg."prefix1, prefix2"， 那么所有目录下文件名以 prefix1，prefix2 开头的文件都不会被上传


+ skip-suffixes: 跳过所有以该后缀列表里面字符串为后缀的文件或者目录，默认为空字符


+ skip-fixed-strings: 跳过所有文件路径（相对路径）中包含该字符串列表中字符串的文件，默认为空字符。


+ debug: 是否 debug 默认为 no ，开启改为 "debug" 会在控制台打印配置文件，

+ delete-unuse-files: 是都删除七牛云中无用文件，默认 false ，每次都删除七牛云空间中无用的文件，如果为 false ， 则只会更新必要的文件，而每次修改博客留下来的无用文件不会被清理，即使您删除了一篇博客，只有没有新的博客与他重名，也不会被删除.如无特殊需要，建议为 true **本人不对任何数据损失负责**


填写好配置之后，推送到仓库，你可以在 action 看到一个按钮手动运行该  action  即可推送仓库至 七牛云。

一份完整的配置如下：
```yml
name: push to qiniu
on: [push, workflow_dispatch]

jobs:
  autopush_job:
    runs-on: ubuntu-latest
    steps:
     - name: running..
       uses: DaxiLi/aja_hexo_push_action@main
       with:
          bucket: your-bucket
          access-key: ${{ secrets.QINIU_ACCESS_KEY }}
          secret-key: ${{ secrets.QINIU_SECRET_KEY }}
          hexo-config-path: your-config-path(maybe you will put the config file in _data/_config.yml)
          theme-config-path: your-theme-config-path(maybe _data/_theme.yml)
          theme-repository: your-theme-repository
          theme-name: your-theme-name
          package-file: your-package.json(_data/package.json)
          package-lock-file: your-package-lock.json(_data/package-lock.json)
          hexo-cli-version: ${{env.hexo_cli_version}}
          sub-dir: ""
          upload-dir: "hexo/public"
          thread-count: 8
          check-hash: true
          check-exists: true
          skip-path-prefixes: ""
          skip-file-prefixes: "" 
          skip-suffixes: ""
          skip-fixed-strings: ""
          debug: no

```

如果不使用这些选项中的某一项，最好的做法是将它从配置文件删除，会自动保持默认选项，而不是将它填为 ""，填为 "" 将导致未知后果
---


现在，您的目录大致是这个样子了

```bash
.
├── .git
├── .github
│   └── workflows
│       └── autopush.yml
├── _data
│   ├── _config.yml
│   ├── theme.yml
│   ├── package-lock.json
│   └── package.json
├── _posts
│   └── HelloWorld.md
├── categories
│   └── index.md
├── galleries
│   └── index.md
├── search
│   └── search.md
└── tags
    └── index.md

```

## Note:

目录及文件名中应该避免出现空格，制表符等特殊字符

[V1 版 README](./README_V1.md)


## enjoy it！

现在，每次更新你的博客仓库，它都会自动推送到你的七牛云