from six import binary_type

from . import serve

def test_make_hosts_file():
    c = serve.Config(
        browser_host=u"foo.bar",
        alternate_hosts={u"alt": u"foo2.bar"}
    )
    c.subdomains = {u"a", u"b", u"\u00E9"}
    c.not_subdomains = {u"x", u"y"}
    hosts = serve.make_hosts_file(c, "192.168.42.42")
    assert isinstance(hosts, binary_type), type(hosts)
    lines = hosts.split(b"\n")
    assert set(lines) == {b"",
                          b"0.0.0.0\tx.foo.bar",
                          b"0.0.0.0\tx.foo2.bar",
                          b"0.0.0.0\ty.foo.bar",
                          b"0.0.0.0\ty.foo2.bar",
                          b"192.168.42.42\tfoo.bar",
                          b"192.168.42.42\tfoo2.bar",
                          b"192.168.42.42\ta.foo.bar",
                          b"192.168.42.42\ta.foo2.bar",
                          b"192.168.42.42\tb.foo.bar",
                          b"192.168.42.42\tb.foo2.bar",
                          b"192.168.42.42\txn--9ca.foo.bar",
                          b"192.168.42.42\txn--9ca.foo2.bar"}
    assert lines[-1] == b""
