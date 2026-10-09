import unittest
import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Load all unit and platform test files
    for p in Path(root_dir / "tests").glob("**/test_*.py"):
        mod_name = p.stem
        # Import dynamically
        import importlib.util
        spec = importlib.util.spec_from_file_location(mod_name, str(p))
        if spec and spec.loader:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            for attr in dir(mod):
                if attr.startswith("test_") and callable(getattr(mod, attr)):
                    func = getattr(mod, attr)
                    
                    class StandaloneTest(unittest.TestCase):
                        pass
                    setattr(StandaloneTest, attr, lambda self, f=func: f())
                    suite.addTest(StandaloneTest(attr))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
