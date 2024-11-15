---
title: "Cleaning git repositories with BFG"
description: "How we reduced the size of our repo by 95%"
featured: true
pubDate: "Dec 09 2018"
tags:
  - git
---
## Introduction

This blog post will be exploring the [BFG](https://rtyley.github.io/bfg-repo-cleaner/) tool and how it can be used to cleanup a `git` repository.

I recently used BFG to cleanup a source code repository used by the product I work on at [Barracuda Networks](https://www.barracudanetworks.com). Some things to note about this repository: it was created in 2010, we recently did a big refactor of the directory hierarchy, and we recently merged in our integration test repository into the source code repository. Merging these two repositories brought in about four years of commit history and a lot of additional "cruft" in the form of integration test data. After all of this we noticed that the size of the repository had exploded to 1.2 gigabytes. Let's see how BFG was able to reduce the size of our repository to 65 megabytes -- which is about a 95 percent reduction in size.

## What is BFG?
BFG is an alternative to `git filter-branch` that can be used to remove large files and sensitive data (such as an accidentally checked-in password/credential) from the repository. You might be thinking "this sounds exacly like what `git filter-branch` can do!". However, BFG has some advantages over `git filter-branch`. Most important is the speed at which BFG can process a repository. The BFG author claims that BFG can be between [10 to 720 times faster](https://rtyley.github.io/bfg-repo-cleaner/##speed) than `git filter-branch`. Additionally, the simplicity of BFG make it [easier to work with](https://rtyley.github.io/bfg-repo-cleaner/#examples) to accomplish the previously mentioned tasks.

## Method 1
The first method to reduce the size of a repository is the `--strip-blobs-bigger-than <size>` BFG flag. This flag attempts to remove all [blobs](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects) larger than `<size>` from the repository. By default, BFG protects the data in `HEAD`, however, you can protect other branches with the `--protect-blobs-from <branch-name>[,<branch-name>]` flag. 

First, you need to clone a mirror of your repository: 
```bash
git clone --mirror <repo-url>
``` 
This will clone only the content of the `.git` folder that lives in the repository. You will notice that none of the tracked files were pulled down since we cloned with `--mirror`. Because of this, the `--mirror` copy of the repository is a bit smaller than the repository with the tracked files included.

Lets check the size of of the repository before running BFG:
```bash
du -sh tdf.old.fork.git
1.0G    tdf.old.fork.git
```

Now, lets use BFG to cleanup the repository. As mentioned, we're going to be using the `--strip-blobs-bigger-than` flag. Note that this flag has an alias of `-b` that I will be using for brevity. I decided to use 50 kilobytes as the size threshold. Run BFG to start the cleanup:

```bash
java -jar bfg-1.13.0.jar -b 50K tdf.old.fork.git
Using repo : /Users/ndichev/Workspace/tmp/tdf.old.fork.git

Scanning packfile for large blobs: 112300
Scanning packfile for large blobs completed in 835 ms.
Found 4316 blob ids for large blobs - biggest=162675600 smallest=51213
Total size (unpacked)=1924659007
Found 1824 objects to protect
(remaining output redacted)
```

Now, we need to expire old entries from the reflog and have `git` do some garbage collection:

```bash
cd tdf.old.fork.git
git reflog expire --expire=now --all && time git gc --prune=now --aggressive
```

The repo should be clean now! Let's check the size:
```bash
du -sh tdf.old.fork.git
49M    tdf.old.fork.git
```

So we managed to reduce the repository size (without source files) from 1 gigabyte to 49 megabytes. Not bad!

## Method 2

As an exercise, I wanted to see if there was another way to cleanup these files. And indeed there is -- instead of having BFG decide which files to remove we can supply a list of blob id's for BFG to remove. This behavior is done with the `--strip-blobs-with-ids` flag (aliased to `-bi`). 

How can we generate a list of blob id's for BFG to delete? Well, we can chain together a few `git` commands to do this. In particular, we can use:

* `git ls-tree` -- list the contents of a `git` tree
* `git cat-file` -- get size information for repository objects
* `git rev-list` -- list commit objects (in reverse-chronological order)

If we chain these together with some Unix essentials (`grep`, `awk`, `sort`, `cut`, and `comm`) we can generate the required list:

```bash
cd tdf.fork.old.git
## We're using 50K as the size here (50 * 1024)
comm -23 \
   < (git rev-list --objects --all | git cat-file  --batch-check="%(objecttype) %(objectname) %(objectsize) %(rest)" | grep ^blob | awk '$3 > 50 * 1024 { print $2 }' | sort) \
   < (git ls-tree -r HEAD | cut -f 1 | cut -d ' ' -f 3 | sort) \
   > ../large-blobs.list
```

We can then pass this list into BFG (following the setup from Method 1) and run the `git` garbage collection
```bash
java -jar bfg-1.13.0.jar -bi large-blobs.list tdf.old.fork.git
cd tdf.old.fork.git
git reflog expire --expire=now --all && time git gc --prune=now --aggressive
```

Let's confirm the repository is smaller:
```bash
du -sh tdf.old.fork.git
48M    tdf.old.fork.git
```

As a bonus, we can use [GNU Parallel](https://www.gnu.org/software/parallel/) to emulate the behavior of the `--protect-blobs-from` BFG flag. By using `parallel` with `git ls-tree`, we can pass a list of refs that we want to leave untouched. Any large blobs that are currently in these refs will not be included in the output file, and therefore not removed by BFG. In the following example, I am going to protect `HEAD`, `release/2018.15`, and `release/2018.16`:

```bash
comm -23 \
   <(git rev-list --objects --all | git cat-file  --batch-check="%(objecttype) %(objectname) %(objectsize) %(rest)" | grep ^blob | awk '$3 > 50 * 1024 { print $2 }' | sort -u) \
   <(parallel -j1 git ls-tree -r ::: HEAD release/2018.15 release/2018.16 | cut -f 1 | cut -d ' ' -f 3 | sort -u) \
   > ../large-blobs.list
```

## Benchmarks
I ran some benchmarks on the two methods and found the following:

|          | Generating Blob List | BFG Execution | Garbage Collection |      Total     |
|----------|:--------------------:|:-------------:|:------------------:|:--------------:|
| Method 1 |          N/A         | 40.73 seconds |   150.22 seconds   | 190.95 seconds |
| Method 2 |      .24 seconds     | 29.34 seconds |    149.3 seconds   | 178.88 seconds |

So the two methods have similar execution times, however, Method 2 is faster. I believe this is due to the fact that BFG has no work to do to find the objects that need to be removed.

## Conclusion
I hope that you have an understanding of the workflow for cleaning up a repository with BFG. If you have a repository that has unexpectedly increased in size try using BFG before reaching for `git filter-branch`!
