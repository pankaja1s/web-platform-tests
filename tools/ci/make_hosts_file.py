import argparse
import os
import sys

from six import text_type

from ..localpaths import repo_root

from ..serve.serve import load_config, make_hosts_file


# get os.linesep as a binary string
if isinstance(os.linesep, text_type):
    _b_linesep = os.linesep.encode("ascii")
else:
    _b_linesep = os.linesep


def create_parser():
    parser = argparse.ArgumentParser()
    parser.add_argument("address", default="127.0.0.1", nargs="?", help="Address that hosts should point at")
    return parser

def run(**kwargs):
    if sys.platform == "win32":
        # Change stdout to binary output as hosts needs to be ASCII encoded.
        # If it is in O_BINARY mode, PowerShell passes byte[] to the pipeline;
        # if it is in O_TEXT, PowerShell passes String to the pipeline.
        import msvcrt
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)

    config = load_config(os.path.join(repo_root, "config.default.json"),
                         os.path.join(repo_root, "config.json"))

    hosts = make_hosts_file(config, kwargs["address"])
    if _b_linesep != "\n":
        hosts.replace(b"\n", _b_linesep)
    print(hosts)
