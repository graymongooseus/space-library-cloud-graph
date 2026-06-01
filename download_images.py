# -*- coding: utf-8 -*-
"""第二批：儿童图书馆+实验室+艺术空间。立即运行！"""
import os, ssl, urllib.request
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")
os.makedirs(DIR, exist_ok=True)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
DOWNLOADS = [
    ("sp_library_kids.jpg", "https://prod-files-secure.s3.us-west-2.amazonaws.com/70b65f8b-eb13-4ca8-b9e8-4cc452d1f915/f4ab566f-2510-4896-9810-f488fb2b66e2/library.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB4667CZYRIB3%2F20260601%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260601T104942Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEEEaCXVzLXdlc3QtMiJGMEQCIA6jQF62L9pyvnTcM%2B7kXAk3OwON9bYzi8pe6nZOHBbuAiBi4chxWthH%2FtzrNPen%2BTz%2Fg5RaULvLYDGx1SmQ9Lbiiyr%2FAwgJEAAaDDYzNzQyMzE4MzgwNSIMNyn6k4iNu4Ny0DdPKtwDDidEkk7HLr%2FEObIc7vkvWO2naBNOGvmU40ErDiiTitSw7fjHBwc6k458MPz9z0awvEEnmxAtCDrdur%2FRiZwwhwgy5c6ToS23FBBeLPNKI8ZZgSGGkO0fIGTxzR6x00O9D%2FCLgTgx%2FTN9Qh2zlipvHHRColqsIIsL7409ecXF7hg%2By0X3GCRFRwPxBrrjQV9SK%2FZc9LxL5b3t8F84QYgqDWM%2F3AGIeAcrE6d%2BFADT6rbLiKAR%2FiLUqEupYC35igLEYSSgIDkQoBL0MH2JZcKBFSj4X7LVIyxZWK5OFAWBHnUFQWCcOsyJ%2BuGFHofdx1fSmyuxMn9Hi9EnizuK4KvWM1LZuYB4IdDW3taVi%2BzbkNBa4vQ9YDLZistxhyPEebaTJd40yiRQYVWLJc1Qfb6%2B7upGBlkL6Gat670MJcn6pK%2Bf8qNdz6ty0A3Pv9yemrlTOiqX%2FFbbTuMl8gSOun5CVPhL%2BjzzMW8DJiUX70qS%2BazoyDWEhC5%2FL1OnOL5OU0cJ9RnhFd%2BhF2WXNUZ3SlMNgfhJdBiDeZlxP9IwYFHDVMUINTXcBacPXecQBGZPB2pzCJa2MjowRN8T6cpDB1PYg9BQBiSXbiEQgiVrXei%2BO3G4eXLwNM47zZYUv1owrIL10AY6pgEi4eUZ0vzk%2FzFo4k0k1MRkdfnfEb2LFboK%2FLxxU2V80TQncBohdOUWYFec9lcX53S9ltrCMGvuJ7ehtQumvImkAkA0esaSlwjF08%2FpcVoZLEG34w5RmxJhF2sbUnp3lQlVwSvJFqdvP8VRlZWaR9%2Fszw8hLw%2BNd%2BLUInBQCcjLG41jUOedVJ%2BXHDVNtjOfK7ewAJzG19wmjQNQizrXSzSbVaaQqxqt&X-Amz-Signature=4e1f8e28daf3c670a37f1f133cdd7dd4b63b05f64bb4c2311baec27e60817c69&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject"),
    ("sp_lab.jpg", "https://prod-files-secure.s3.us-west-2.amazonaws.com/70b65f8b-eb13-4ca8-b9e8-4cc452d1f915/41965054-8863-4e36-af7a-ecdde48ea921/Enscape_2023-12-21-11-13-01.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466R23P5EIO%2F20260601%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260601T104949Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEEEaCXVzLXdlc3QtMiJIMEYCIQD1%2Fg1giI4yTa1cZN6HrY7mP%2Bl6Y3ZrIbVLtx13yRuUIgIhAJVNqEh8pNP3B4ux7hXTwnw%2B5G%2F9Wtq%2Fl9mZnpTQmbxsKv8DCAkQABoMNjM3NDIzMTgzODA1IgyON0j0rmEh2dqQsA4q3AMvaneNGIsivfh%2FFfEmKEDGt%2BifJyLjsgM%2BIhx9rEPN2TC1sHMvEY0jrXRnkae9T6PmS295e98LFHUb7TFJFL9ax11%2FVFQmLbc7xAly87ksEX9V9zAtOUXlqtIq6qIRTvDFZ58Z%2F35ree0pjogQ0ARNzt0V2HS%2FZcTlhtyv0NtZuPQalz%2FUDrTwJEoPuJMnKMQ1KTe%2BfaS5LevdZFHdaSa9uY28DOItCOSjx99npxW4p4v%2BFhwbeYZ0i2oeFbjc2kVdGDUMPlqX3KmNjcRRcK%2FF9FluZeJtQsNPxoXdMQsxAJt3bnHKlqPCsVgrB0UYbDixlRm1jxfiOnsQzyJeeql%2F4Rt4yyMe%2B9dmu6X9ndUTe8PX%2FcX%2ByrimLl0%2FA8CE%2B5VbRwnH3YbSW1GpmsiAsBdoSGaK7La91SGqaGIKIEnlwCNdsxsnC18otqCMO5oLyM7MPRfCbfG6UhUcHaxVEAt%2B7kEPow%2BFNd6UO%2BJKlXN4T%2F5zRAmw5wljzjqxPIacuCexF8zeJD8e6uvWFbfOkaccGaIQzjmypg42AkYrwaZgJQRLa%2FEy%2BW8%2FKtrgGlToQzmdqRBK1FmldWjDZz40FTy0%2BH%2FgUDiiYyGaxsQrCLtSFl5TrLPFYr96H5hNXzCJgfXQBjqkATZX%2BYTkceP7rbudwQVYNXwyXAI2mamPgqcDeNSUlJgVuTwXiCAFuW37r5kyBCuSgI5ELgtKkBhVTbPvY3%2B3c%2FtdFl6HBVx8xuVhNzxUP0MWpsj9aO74p6l%2FzSAp8JTK%2FVJppsd92cBUbdzxQ%2BNzPBrixcB%2F1Zmj3a%2BhFFuddcXwZ%2BWXSI2LqS4aGSn5Ur%2FcS4HGxqJ%2FfVg9RkpgSsls1mmM3oeB&X-Amz-Signature=18c15407fe077e4657ba0996564914c7333512b484fbd7be929c6bc13e45ab48&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject"),
    ("sp_art_space.jpg", "https://prod-files-secure.s3.us-west-2.amazonaws.com/70b65f8b-eb13-4ca8-b9e8-4cc452d1f915/4eeefc52-92af-4327-a9b8-e15fa215fa14/Enscape_2022-05-16-22-22-36.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466U3I46MSX%2F20260601%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260601T104955Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEEEaCXVzLXdlc3QtMiJGMEQCICKDC%2B4wRRX0%2BXaccFqQtA04ujVI%2BXzHFvs2HVmp3GiaAiA5ksIoZcWvfXNG6Psmt4QBi5nmm2ODE%2FRBxCJqz357JSr%2FAwgKEAAaDDYzNzQyMzE4MzgwNSIM93WiD3ofOQC5y99UKtwDVA%2Fr0BOKi2lmXm6cFpq1JiQgOURsJeOwk2%2B7Zs4ju%2Fiyd6LRijVpOH7j0hTBUCGG2rlZh%2Fff5yyNJJCzIxwtiuqD%2FJR3izQ%2BDzWpf06phm3br0qQErjPe4fbOpWgL0guebhku%2FaneJ4G5E7XhcmoJXmqqc2gzjFvl5xv5q3NQBibahy9YcwOrXFzA4p3MWigmKga%2FkT18dQVsAIORYPfFG8AoZ2uErGJP%2FFq0ehUfYMUEcdlo9b8SMZ8lL9BKbYy6IslWtvwYRnhArnA9B2wjyFbB0VO6Z0avdRuMtR2yUn6EI9u3tImhYN7%2FCUrvKH3govysUwSg3I1uipgpPCOdcDSYyIqf1vZZcPMORr3jeL7Naq5Y0v6UHFwhQ01AazHs%2F%2BJOj%2BTcL7GF65CBzS2rFd%2Fqk5i07eeHvpPnbShXNUWVkD%2BydKWSOPzKXcVVyOjevW6gODyxnbIRsrRuXgYsal0pi2qZ4msbZR%2BxHsbmBgmZesnrfrpjkt461fw6Nf6k4gtys2VmgTk9rZZUlWeijHJ3LKWn3WvDCVPkWo0%2BhTZxr4WfDrCtHdTWG5AzHrDn3LJYW6BkmUPxrQukqp5eJzxIR5dtfv04%2Ft7IoQLQqnOiEuAHcjyBbx0IxMwxIP10AY6pgHOE1ff8V4lrYsYdV5LwN0QrH2%2BIZc7AKOkiHu4YLq%2FCSnxSgXT5yx%2F3%2BdmJl3zKPJRp5KmvKLLxcWrYPcNXLD9AA06%2BtBM8oiR9oIzQPQ9iTk642hTHt0XhFYLdwmHL2UGbBcv5yTi3%2BGPrkeNqsr13ydJ8eSZ93ECCTlTdYE%2FzY8TijowP%2FGov6yDJ7Y2ZXRltT7HeSKh1OLx4MulO5beZCbwgjjU&X-Amz-Signature=a76086c2b7b503702f9550a5274ec0e2a7f7cfafb911cdded0cf18ba3c91d484&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject"),
]
print(f"\n  下载3张图 -> {DIR}\n")
ok = 0
for i, (name, url) in enumerate(DOWNLOADS, 1):
    path = os.path.join(DIR, name)
    print(f"  [{i}/{len(DOWNLOADS)}] {name} ... ", end="", flush=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, context=ctx)
        with open(path, "wb") as f:
            f.write(resp.read())
        sz = os.path.getsize(path)
        if sz > 1000:
            print(f"OK ({sz//1024}KB)")
            ok += 1
        else:
            print("FAILED"); os.remove(path)
    except Exception as e:
        print(f"FAILED: {e}")
print(f"\n  Done! {ok}/3\n")
input("Enter...")
