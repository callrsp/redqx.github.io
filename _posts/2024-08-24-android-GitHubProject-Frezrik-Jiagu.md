---
layout: post
title:  "(Frezrik/Jiagu)项目分析"
date:   2024-08-24 00:00:00 +0800
categories: [android]    
---



# 序言

安卓, 基于动态加载的不落地加载壳: [https://github.com/Frezrik/Jiagu](https://github.com/Frezrik/Jiagu)

我自己添加了一些注释,,为了方便调试,,,做了一些更改,,,,, []()

项目结构

```
.
├── app
├── jiagu
├── JiaguTool
├── pack
└── ...
```

app: 原始待加载项目

jiagu: dex加载器

JiaguTool : 类似于与release文件, 复制加壳的

pack: 加壳器,,负责提取, 解包打包签名.....



不落地加载壳区别于一代的落地动态加载壳,有什么区别....以下是我的一些看法...

- 落地加载指的是原始的,待加载的dex或者apk会存在于某个磁盘目录中,,然后我们通过自定义的dexclassloader去加载它
- 不落地加载,指的是我们的成品apk或者dex不会以磁盘文件的形式存在于某个目录...但是会以其它方式存在于某个内存中....

  注意是非成品的形式存在于某个目录然后加载,,,比如我们可以加密它然后存在于某个目录,,,或者我们把它整合进loader.dex中



为了方便学习,我修改了该项目的一些功能 

- dex的加载是直接去`asset/i11111i111.zip`中提取dex文件,,,灵感来自项目[函数抽取壳: dpt-shell](https://github.com/luoyesiqiu/dpt-shell)

- 把子项目'jiagu'整合进了'app'中...修改app的Androidmanifest.xml的Application为自定义的加载器,==>为了方便调试和理解项目

- 去掉libjiagu.so的主动加载

  ```
      static {
          System.loadLibrary("jiagu");
      }
  ```

- 去掉了attach函数的在JNI_LOAD注册

- 直接把项目一分为二吧..眼不见,心不烦,,,,一个用于Android8.0以上,一个用于Android8.0以下,分开单独分析



修改后的项目如下 [https://github.com/redqx/Jiagu2](https://github.com/redqx/Jiagu2) 

同时该项目对apk起作用分为两套流程, Android8.0以下版本和以上版本



> 某朋友评价此项目: 

从开发者角度来说,,,该项目写的不是很好,,,不方便二次开发,,,

从学习角度来说, 还是很不错的,,但有些地方思考的不是很全面



# 加载器分析



## Android8.0以上分析

Android8.0及以上采用系统提供的InMemoryDexClassLoader实现内存加载dex



### 详细分析



#### attachBaseContext()部分



首先进入函数 StubApp.attachBaseContext(),然后调用native的attch函数

```java
@Override
protected void attachBaseContext(Context context)
{
    super.attachBaseContext(context);
   // System.load(AssetsUtil.copyJiagu(context));
    attach(this);
}
//ps: Application类继承自 ontext
```

进入attach函数

```c
extern "C"
JNIEXPORT void JNICALL
Java_com_example_jiagu_StubApp_attach(JNIEnv *env, jclass clazz, jobject cur_application)
{
    //JNIEnv *env, jclass clazz, jobject application
    // TODO: implement attach()
    init(env, cur_application);

    // 从/data/app/xxx/base.apk获取dex
    LOGD("[-]getDex");
    //jbyteArray dexArray = getDex(env, application); //修改了dex加载的方式,从asset的i11111i111.zip读取dex

    // 内存加载dex
    LOGD("[-]loadDex");
    loadDex(env, cur_application);

    uninit(env);
}
```

首先进入attach.init()函数, 传入的参数是env和cur_application

```c
static void init(JNIEnv *env, jobject application)
{
    SetEnv(env);//全局变量赋值, g_envPtr = env
    ndk_init(env);//创建一块区域,写入了字节码..估计是为了后续的Hook, 这是大于Android 8.0的情况
    
    //然后是全局变量的赋值
    jobject ctx = CallObjectMethod(application, "getBaseContext", "()Landroid/content/Context;").l;
    //getBaseContext是ContextWrapper的方法,application继承于ContextWrapper
    
    g_context = env->NewGlobalRef(ctx);
    g_sdk_version = GetStaticField("android/os/Build$VERSION", "SDK_INT", "I").i;
}
```

然后,我们回到函数attach(),并进入函数`loadDex()`

首先是获取asset/app_name, 该文件记录了原始的application的名称

然后是获取asset/i11111i111.zip, 它是dex的压缩包

```c
    // 调用源文件的java层代码, 获取application的原始类名, 也就是读取文本文件, asset/app_name
    jstring appname_java= static_cast<jstring>(CallObjectMethod(
            cur_application,
            "getAppName",
            "(Landroid/content/Context;)Ljava/lang/String;", cur_application).l);

    char *app_name = const_cast<char *>(env->GetStringUTFChars(appname_java, nullptr));
    LOGD("app name: %s", app_name);


    // 调用源文件的java层代码, 读取目录asset/i11111i111.zip, 它是dex的压缩包
    jobjectArray dexList= static_cast<jobjectArray>(CallObjectMethod( //返回的类似于byte[][]
            cur_application,
            "readDex",
            "(Landroid/content/Context;)[[B", cur_application).l);
    jsize dex_cnt = env->GetArrayLength(dexList);//原始dex个数
```

其中readDex返回的是一个 `byte[][]`类型的数组, 装的是dex文件的内容, 

然后获取一下classLoader

```c
jobject classLoader = CallObjectMethod(g_context, "getClassLoader", "()Ljava/lang/ClassLoader;").l;
```

接着取出每个dex文件内容,转化形式,让入dexBuffers

```c
    for(int i=0; i < dex_cnt; i++)
    {
        jbyteArray innerArray = static_cast<jbyteArray>(env->GetObjectArrayElement(dexList, i));
        jbyte* dex_data = env->GetByteArrayElements(innerArray, nullptr);
        jsize innerLength = env->GetArrayLength(innerArray);

        //把每个dex的内容放进 vector dexBuffers
        jobject dexBuffer = env->NewDirectByteBuffer(reinterpret_cast<char *>(dex_data), innerLength);
        dexBuffers.push_back(dexBuffer);

    }
```

接着,又转化形式, 把dexBuffers转`dexBufferArr `,  `dexBufferArr `是一个`ByteBuffer[]`类型

大概是为了之后的InMemoryDexClassLoader,此类的构造函数需要`ByteBuffer[]`类型

```c
    jclass ElementClass_ByteBuffer = env->FindClass("java/nio/ByteBuffer");
    jobjectArray dexBufferArr = env->NewObjectArray(dexBuffers.size(), ElementClass_ByteBuffer, NULL);
    for (int i = 0; i < dexBuffers.size(); i++)
    {
        //转存dex内容? 放进 jobjectArray dexBufferArr
        env->SetObjectArrayElement(dexBufferArr, i, dexBuffers[i]);
    }
```

接着调用`InMemoryDexClassLoader` 完成dex的加载

```c
    jclass InMemoryDexClassLoaderClass = env->FindClass("dalvik/system/InMemoryDexClassLoader");
    jmethodID InMemoryDexClassLoaderInit = env->GetMethodID(
            InMemoryDexClassLoaderClass,
            "<init>",
            "([Ljava/nio/ByteBuffer;Ljava/lang/ClassLoader;)V");

    //调用构造函数 public InMemoryDexClassLoader (ByteBuffer[] dexBuffers, ClassLoader parent)
    // 这里已经完成了dex的自动加载....疑惑的是它并没有指定so的加载路径
    jobject mm_InMemoryDexClassLoader = env->NewObject(
            InMemoryDexClassLoaderClass,
            InMemoryDexClassLoaderInit,
            dexBufferArr,//成员得是ByteBuffer[],类似于byte[][]
            classLoader);//并没有用确定so的加载路径
```

接着,,调用`DexPathList.makeInMemoryDexElements(...)`,生成dexElements[]

```c
    jobjectArray dexElements;
    //替换DexPathList列表...

    jclass list_jcs = env->FindClass("java/util/ArrayList");
    jmethodID list_init = env->GetMethodID(list_jcs, "<init>", "()V");
    jobject list_obj = env->NewObject(list_jcs, list_init);
    dexElements = static_cast<jobjectArray>(CallStaticMethod(
            "dalvik/system/DexPathList",
            "makeInMemoryDexElements",
            "([Ljava/nio/ByteBuffer;Ljava/util/List;)[Ldalvik/system/DexPathList$Element;",
            dexBufferArr,
            list_obj).l);
    //public static Element[] makeInMemoryDexElements(..
    /*
     * makeInMemoryDexElements做的工作类似于 makeDexElements
     * 在DexPathList的初始化中,就会调用makeDexElements. 也可以这么说InMemoryDexClassLoaderInit的调用已经生成了一个一模一样的Elements[]
     * 所有这里又生成了一遍????大概DexPathList.dexElements[]是私有的,同时makeDexElements也是私有的.但是makeInMemoryDexElements是公开的
     * */
```

值得注意的是的 InMemoryDexClassLoader 会调用父类  BaseDexClassLoader的构造函数

BaseDexClassLoader初始化会调用DexPathList,来初始化this.pathList

DexPathList会调用makeDexElements()来生成含有DexFile的elements

DexPathList.makeInMemoryDexElements()可以达到相同的效果...大概吧

接着作者把elements转化形式, 大概是为了后续把element添加到已有的dexElements中

```c
    for (int i = 0; i < env->GetArrayLength(dexElements); i++)
    {
        dexobjs.push_back(env->GetObjectArrayElement(dexElements, i));//感觉有点多此一举,dexElements本身就算数组了
    }
```

然后调用make_dex_elements

```
make_dex_elements(env, classLoader, dexobjs);//把自己的dexobjs添加到已经的dexElements里面
```

进入make_dex_elements()



先拿到 dexElement = classLoader.pathList(DexPathList).dexElements(Element)

```c
    jclass PathClassLoader = env->GetObjectClass(classLoader);
    jclass BaseDexClassLoader = env->GetSuperclass(PathClassLoader);
    // get pathList fieldid
    jfieldID pathListid = env->GetFieldID(BaseDexClassLoader, "pathList", "Ldalvik/system/DexPathList;");
    jobject pathList = env->GetObjectField(classLoader, pathListid);

    // get DexPathList Class
    jclass DexPathListClass = env->GetObjectClass(pathList);
    // get dexElements fieldid
    jfieldID dexElementsid = env->GetFieldID(DexPathListClass, "dexElements", "[Ldalvik/system/DexPathList$Element;");
    jobjectArray dexElement = static_cast<jobjectArray>(env->GetObjectField(pathList, dexElementsid));

    jint len = env->GetArrayLength(dexElement);
```



接着就创建一个新的new_dexElement, 然后把原有的dexElement放进new_dexElement

然后再把之前makeInMemoryDexElements()制作好的element放进new_dexElement

```c
    jint len = env->GetArrayLength(dexElement);

    LOGD("[+]Elements size:%d, dex File size: %d", len, dexFileobjs.size());

    // Get dexElement all values and add  add each value to the new array
    jclass ElementClass = env->FindClass("dalvik/system/DexPathList$Element"); // dalvik/system/DexPathList$Element
    jobjectArray new_dexElement = env->NewObjectArray(len + dexFileobjs.size(), ElementClass, NULL);
    for (int i = 0; i < len; i++)//放入原有的, 一当前情况 len=1, 并且该element = base.apk
    {
        env->SetObjectArrayElement(new_dexElement, i, env->GetObjectArrayElement(dexElement, i));
    }


    for (int i = 0; i < dexFileobjs.size(); i++)//放入我们自己生成的
    {
        env->SetObjectArrayElement(new_dexElement, len + i, dexFileobjs[i]);
    }
```

接着替换 classLoader.pathList(DexPathList).dexElements(Element) = new_dexElement

```c
env->SetObjectField(pathList, dexElementsid, new_dexElement);
```

![image-20240825210441079](https://raw.githubusercontent.com/redqx/redqx.github.io/master/_posts/img/image-20240825210441079.png)

可以看到,dexElements[0]是原有的, dexElements[1,2,3]都是我们后续添加的

dexElements[0]是base.zip

同时我们也可以注意的dexElements是一个基于DexPathList的数组

而DexPathlist含有DexFile结构体,DexPathlist该类主要用来查找Dex、SO库的路径，并这些路径整体呈一个数组



然后返回函数make_dex_elements, 回到loadDex, 进入函数hook_application

此刻我们已经把原始的dex成功加载进内存了, 继续要做的是替换

进入hook_application, 发现仅有的操作是调用java层的invoke2

进入java层,发现仅有的操作是调用 ApplicationHook.hook

接下来进入 ApplicationHook.hook

```java
    public static void hook(
            Application cur_application,
            String org_ApplicationName
    )
    {
        if (TextUtils.isEmpty(org_ApplicationName) || "com.frezrik.jiagu.StubApp".equals(org_ApplicationName))
        {
            org_Application = cur_application;
            return;
        }

        Log.w("NDK_JIAGU", "hook");
        try
        {
            // 先获取到ContextImpl对象
            Context contextImpl = cur_application.getBaseContext();
            // 创建插件中真实的Application且，执行生命周期
            ClassLoader classLoader = cur_application.getClassLoader();
            Class<?> cls_org_application = classLoader.loadClass(org_ApplicationName);
            org_Application = (Application) cls_org_application.newInstance();

            // 走DelegateApplication的生命周期
            Reflect.invokeMethod(
                    Application.class,
                    org_Application,
                    new Object[]{contextImpl},
                    "attach",
                    Context.class);
        } catch (Exception e)
        {
            e.printStackTrace();
        }
    }
```



干的事情不多, 首先创建原来的`org_Application = (Application) class_org_application.newInstance();`

然后调用`org_application.attach(cur_application.getBaseContext())`

```java
org_application.attach(cur_application.getBaseContext())
应该等价于
org_application.attach(cur_application.mbase) //Context mBase;
```



attach是干嘛的?  application继承了ContextWrapper, ContextWrapper继承了context

```java
    @UnsupportedAppUsage
    /* package */ 
	final void attach(Context context) 
    {
        //Application.attach
        attachBaseContext(context);
        mLoadedApk = ContextImpl.getImpl(context).mPackageInfo;
        //等价于? mLoadedApk = context.mPackageInfo;
    }


    protected void attachBaseContext(Context base) //所以org_application.mBase=cur_application.mbase
    {// ContextWrapper.attachBaseContext
        if (mBase != null) 
        {
            throw new IllegalStateException("Base context already set");
        }
        mBase = base;
    }

    @UnsupportedAppUsage
    static ContextImpl getImpl(Context context) //ContextImpl.getImpl
    {
        Context nextContext;
       /* while ((context instanceof ContextWrapper) &&
                (nextContext=((ContextWrapper)context).getBaseContext()) != null) */
        while ((context instanceof ContextWrapper) && //
                (nextContext=context.mBase) != null) 
        {
            context = nextContext;
        }
        return (ContextImpl)context;//我们这里传递进来的是ContextImpl的mbase,所以直接返回mbase
    }
```

可以看出org_application.attach修改了mbase和mLoadedApk成员变量

```
大概:
org_application.mbase = cur_application.mbase
org_application.mLoadedApk =cur_application.mbase.mPackageInfo //mPackageInfo是ContextImpl的成员
```

到这里,,,,cur_application.attachBaseContext(..)函数就走完了



#### OnCreate()部分



接下来进入cur_application.OnCreate()

```java
    @Override
    public void onCreate()
    {
        super.onCreate();
        ApplicationHook.replaceApplicationContext(this);//传入的是cur_application
    }
```

ApplicationHook.replaceApplicationContext(this);就是做一个信息替换了



首先调用 cur_application.mbase.setOuterContext(org_Application), 

```java
// 先获取到ContextImpl对象
Context contextImpl = cur_application.getBaseContext();

// 替换ContextImpl的代理Application
Reflect.invokeMethod(
        contextImpl.getClass(),//class
        contextImpl,//obj
        new Object[]{org_Application},//实际参数
        "setOuterContext", //setOuterContext是ContextImpl的成员方法
        Context.class //参数类型
);
```

效果是 cur_application.mbase.mOuterContext(Context) = org_Application

接着执行

```java
            // 替换ActivityThread的代理Application
            Object mMainThread = Reflect.getFieldValue(contextImpl.getClass(), contextImpl, "mMainThread");
            Reflect.setFieldValue("android.app.ActivityThread", mMainThread, "mInitialApplication", org_Application);
```

效果是 cur_application.mbase.mMainThread.mInitialApplication = org_Application

然后执行

```java
ArrayList<Application> mAllApplications = (ArrayList<Application>) Reflect.getFieldValue("android.app.ActivityThread", mMainThread, "mAllApplications");
mAllApplications.add(org_Application);//添加新的
mAllApplications.remove(cur_application);//删除原始的
```

效果是

```java
cur_application.mbase.mMainThread.mAllApplications.add(org_Application);
cur_application.mbase.mMainThread.mAllApplications.remove(cur_application);
```

接着执行

```java
// 替换LoadedApk的代理Application
Object loadedApk = Reflect.getFieldValue(contextImpl.getClass(), contextImpl, "mPackageInfo");
Reflect.setFieldValue("android.app.LoadedApk", loadedApk, "mApplication", org_Application);
```

效果是cur_application.mbase.mPackageInfo(LoadedApk).mApplication = org_Application

还记得之前org_application.attach中, org_application.mLoadApk = cur_application.mbase.mPackageInfo ?



接着执行

```
// 替换LoadedApk中的mApplicationInfo中name
ApplicationInfo applicationInfo = (ApplicationInfo) Reflect.getFieldValue("android.app.LoadedApk", loadedApk, "mApplicationInfo");
applicationInfo.className = org_Application.getClass().getName();
```

效果是 cur_application.mbase.mPackageInfo(LoadedApk).mApplicationInfo.className = org_Application.getClass().getName();

然后执行

```
org_Application.onCreate();
```

整体的过程就这样结束了....



### 小结

我修改了作者项目的一些写法,为了自己更加方便调试和理解



> attachBaseContext()

1), 先通过InMemoryDexClassLoader()加载我们的dex文件

2), 然后自己再通过 public static Element[] DexPathList.makeInMemoryDexElements 再生成dexElemens

生成的dexElemens应该和 class_loader.pathList.dexElements是一样的

3), 然后把新建一个dexElements, 放入classloader原有的element,然后添加自己makeInMemoryDexElements()生成的

然后修改  classLoader.pathList(DexPathList).dexElements(Element) = new_dexElement

4), 新建Object: org_application, 调用org_application.attach, 实现org_application.mbase和org_application.mLoadApk的修改

> OnCreate()

依然是一些信息的替换

```
cur_application.mbase.setOuterContext(org_Application)
cur_application.mbase.mMainThread.mInitialApplication = org_Application
cur_application.mbase.mMainThread.mAllApplications.add(org_Application);
cur_application.mbase.mMainThread.mAllApplications.remove(cur_application);
cur_application.mbase.mPackageInfo(LoadedApk).mApplication = org_Application
cur_application.mbase.mPackageInfo(LoadedApk).mApplicationInfo.className = org_Application.getClass().getName();
org_Application.onCreate();
```

大概的流程就是这样了,,,很多分析过程还是模棱两可....😂😂





## Android8.0以下分析

在<<Android8.0以上分析>>分析二代基础上,,,我们接着分析

未完待续....

# 加壳器分析
