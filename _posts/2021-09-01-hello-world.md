---
layout: post
title:  "hello world"
date:   2021-09-01 19:39:02 +0800
categories: [others] 
---


# Quick Start



直接下载博客模板 http://jekyllthemes.org/

之后只需要在模板修改内容, git上传即可

图片链接替换

```
./img/ 
==>
https://raw.githubusercontent.com/redqx/redqx.github.io/master/_posts/img/ 
```







test img show

![avatar-13](./img/image-20240725-touxiang.jpg)

![avatar-13](https://github.com/redqx/redqx.github.io/tree/master/_posts/img/image-20240725-touxiang.jpg)

![avatar-13](https://raw.githubusercontent.com/redqx/redqx.github.io/master/_posts/img/image-20240725-touxiang.jpg)

![avatar-13](https://redqx.github.io/_posts/img/image-20240725-touxiang.jpg)

# ssh上传

为什么不用https,这个老是出现问题.

好吧也不能这样说,应该说 ssh出现问题就用https

```
git remote set-url origin git@github.com:i1oveyou/i1oveyou.github.io.git
```



# upload

```
git add .
git commit -m "happy every day"
git push -u origin master
```





# theme_config



> _layouts\default.html



1), 个人头像

```
<a href="/"><img class="profile-avatar" src="{{ site.avatar_url }}" height="75px" width="75px" /></a>
===>改为
<a href="/"><img class="profile-avatar" src="{{ site.avatar_url }}" height="120px" width="120px" /></a>
```



2), 页脚的GitHub

```
<div class="btn-github" style="float:right;">
<iframe src="https://ghbtns.com/github-btn.html?user=enovella&repo=enovella.github.io&type=star&count=true" frameborder="0" scrolling="0" width="85" height="20px"></iframe>
<iframe src="https://ghbtns.com/github-btn.html?user=enovella&repo=enovella.github.io&type=fork&count=true" frameborder="0" scrolling="0" width="85" height="20px"></iframe>

===>改为   
<div class="btn-github" style="float:right;">
<iframe src="https://ghbtns.com/github-btn.html?user=i1oveyou&repo=i1oveyou.github.io&type=star&count=true" frameborder="0" scrolling="0" width="85" height="20px"></iframe>
<iframe src="https://ghbtns.com/github-btn.html?user=i1oveyou&repo=i1oveyou.github.io&type=fork&count=true" frameborder="0" scrolling="0" width="85" height="20px"></iframe>
</div>
```







# toc



 _layouts\post.html

https://github.com/allejo/jekyll-toc

https://www.70apps.com/blog/code/2021/10/27/JEKYLL_TOC_THEME.html

只需要在xx出添加一句`<div class="content_toc">{% include toc.html html=content %}</div>`

如下所示

```
<div class="content_toc">{% include toc.html html=content %}</div>

<div class="content">
  <div class="post">{{ content }}</div>
  {% include share-page.html %}
</div>
```





# avatar



static\css\main.css

```
div.col-sm-3 img.profile-avatar {
  border-radius: 150px;
  -webkit-border-radius: 150px;
  -moz-border-radius: 150px;
  -ms-border-radius: 150px;
  -o-border-radius: 150px;
  margin-left: auto;
  margin-right: auto;
}
      
 ===>改为 

div.col-sm-3 img.profile-avatar {
/*  border-radius: 150px;
  -webkit-border-radius: 150px;
  -moz-border-radius: 150px;
  -ms-border-radius: 150px;
  -o-border-radius: 150px;*/
  margin-left: auto;
  margin-right: auto;
}
```



