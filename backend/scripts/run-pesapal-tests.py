#!/usr/bin/env python3
"""
Pesapal Payment Tests Runner Script
Comprehensive test execution with detailed reporting
"""

import os
import sys
import subprocess
import json
import time
from datetime import datetime
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

class Colors:
    """ANSI color codes for terminal output"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    PURPLE = '\033[0;35m'
    CYAN = '\033[0;36m'
    WHITE = '\033[1;37m'
    NC = '\033[0m'  # No Color

class PesapalTestRunner:
    """Pesapal test runner with comprehensive reporting"""

    def __init__(self):
        self.start_time = time.time()
        self.test_results = {}
        self.backend_path = Path(__file__).parent.parent / 'backend'
        self.reports_path = self.backend_path / 'test-reports'

        # Ensure reports directory exists
        self.reports_path.mkdir(exist_ok=True)

        # Set environment variables
        os.environ['PYTHONPATH'] = str(self.backend_path)
        os.environ['FLASK_ENV'] = 'testing'
        os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

    def print_status(self, message, color=Colors.BLUE):
        """Print colored status message"""
        print(f"{color}[INFO]{Colors.NC} {message}")

    def print_success(self, message):
        """Print success message"""
        print(f"{Colors.GREEN}[SUCCESS]{Colors.NC} {message}")

    def print_warning(self, message):
        """Print warning message"""
        print(f"{Colors.YELLOW}[WARNING]{Colors.NC} {message}")

    def print_error(self, message):
        """Print error message"""
        print(f"{Colors.RED}[ERROR]{Colors.NC} {message}")

    def run_command(self, command, description):
        """Run command and capture output"""
        self.print_status(f"Running {description}...")

        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                cwd=self.backend_path.parent
            )

            self.test_results[description] = {
                'command': command,
                'returncode': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'success': result.returncode == 0
            }

            if result.returncode == 0:
                self.print_success(f"{description} completed successfully")
                return True
            else:
                self.print_error(f"{description} failed with code {result.returncode}")
                if result.stderr:
                    print(f"{Colors.RED}STDERR:{Colors.NC} {result.stderr}")
                return False

        except Exception as e:
            self.print_error(f"Failed to run {description}: {str(e)}")
            self.test_results[description] = {
                'command': command,
                'returncode': -1,
                'error': str(e),
                'success': False
            }
            return False

    def install_dependencies(self):
        """Install test dependencies"""
        dependencies = [
            'pytest',
            'pytest-flask',
            'pytest-cov',
            'pytest-mock',
            'pytest-xdist',
            'pytest-html',
            'pytest-benchmark'
        ]

        command = f"pip install -q {' '.join(dependencies)}"
        return self.run_command(command, "Installing test dependencies")

    def run_utility_tests(self):
        """Run Pesapal utility tests"""
        command = (
            "pytest backend/app/tests/pesapal/test_pesapal_utils.py -v "
            "--tb=short --color=yes --durations=10 "
            "--cov=backend/app/utils/pesapal_utils "
            "--cov-report=html:backend/test-reports/pesapal-utils-coverage "
            "--html=backend/test-reports/pesapal-utils-report.html "
            "--self-contained-html"
        )
        return self.run_command(command, "Pesapal utility tests")

    def run_route_tests(self):
        """Run Pesapal route tests"""
        command = (
            "pytest backend/app/tests/pesapal/test_pesapal_routes_complete.py -v "
            "--tb=short --color=yes --durations=10 "
            "--cov=backend/app/routes/payments/pesapal_routes "
            "--cov-report=html:backend/test-reports/pesapal-routes-coverage "
            "--html=backend/test-reports/pesapal-routes-report.html "
            "--self-contained-html"
        )
        return self.run_command(command, "Pesapal route tests")

    def run_complete_test_suite(self):
        """Run complete Pesapal test suite"""
        command = (
            "pytest backend/app/tests/pesapal/ -v "
            "--tb=short --color=yes --durations=10 "
            "--cov=backend/app/utils/pesapal_utils "
            "--cov=backend/app/routes/payments/pesapal_routes "
            "--cov-report=html:backend/test-reports/pesapal-complete-coverage "
            "--cov-report=term-missing "
            "--html=backend/test-reports/pesapal-complete-report.html "
            "--self-contained-html "
            "--junit-xml=backend/test-reports/pesapal-junit.xml"
        )
        return self.run_command(command, "Complete Pesapal test suite")

    def run_performance_tests(self):
        """Run performance tests"""
        command = (
            "pytest backend/app/tests/pesapal/test_pesapal_routes_complete.py::TestPesapalPerformance -v "
            "--tb=short --color=yes --durations=10 --benchmark-only"
        )
        return self.run_command(command, "Pesapal performance tests")

    def run_security_tests(self):
        """Run security tests"""
        command = (
            "pytest backend/app/tests/pesapal/test_pesapal_routes_complete.py::TestPesapalSecurityFeatures -v "
            "--tb=short --color=yes --durations=10"
        )
        return self.run_command(command, "Pesapal security tests")

    def run_integration_tests(self):
        """Run integration tests"""
        command = (
            "pytest backend/app/tests/pesapal/test_pesapal_routes_complete.py::TestPesapalIntegrationScenarios -v "
            "--tb=short --color=yes --durations=10"
        )
        return self.run_command(command, "Pesapal integration tests")

    def run_edge_case_tests(self):
        """Run edge case tests"""
        command = (
            "pytest backend/app/tests/pesapal/test_pesapal_routes_complete.py::TestPesapalEdgeCases -v "
            "--tb=short --color=yes --durations=10"
        )
        return self.run_command(command, "Pesapal edge case tests")

    def run_data_validation_tests(self):
        """Run data validation tests"""
        command = (
            "pytest backend/app/tests/pesapal/test_pesapal_routes_complete.py::TestPesapalDataValidation -v "
            "--tb=short --color=yes --durations=10"
        )
        return self.run_command(command, "Pesapal data validation tests")

    def generate_summary_report(self):
        """Generate comprehensive test summary"""
        self.print_status("Generating test summary report...")

        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results.values() if result['success'])
        failed_tests = total_tests - successful_tests

        # Calculate test execution time
        execution_time = time.time() - self.start_time

        # Count test files and functions
        test_files = len(list((self.backend_path / 'app' / 'tests' / 'pesapal').glob('test_*.py')))

        # Try to count test functions
        test_functions = 0
        try:
            result = subprocess.run(
                'grep -r "def test_" backend/app/tests/pesapal/ | wc -l',
                shell=True,
                capture_output=True,
                text=True,
                cwd=self.backend_path.parent
            )
            if result.returncode == 0:
                test_functions = int(result.stdout.strip())
        except:
            test_functions = "Unknown"

        # Create summary report
        summary = {
            'timestamp': datetime.now().isoformat(),
            'execution_time_seconds': round(execution_time, 2),
            'total_test_suites': total_tests,
            'successful_test_suites': successful_tests,
            'failed_test_suites': failed_tests,
            'test_files': test_files,
            'test_functions': test_functions,
            'test_results': self.test_results,
            'reports_generated': {
                'coverage_report': str(self.reports_path / 'pesapal-complete-coverage' / 'index.html'),
                'html_report': str(self.reports_path / 'pesapal-complete-report.html'),
                'junit_xml': str(self.reports_path / 'pesapal-junit.xml')
            }
        }

        # Save summary to JSON
        summary_file = self.reports_path / 'pesapal-test-summary.json'
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)

        # Print summary
        print(f"\n{Colors.CYAN}📊 TEST SUMMARY{Colors.NC}")
        print("=" * 50)
        print(f"Execution time: {Colors.WHITE}{execution_time:.2f} seconds{Colors.NC}")
        print(f"Test suites run: {Colors.WHITE}{total_tests}{Colors.NC}")
        print(f"Successful: {Colors.GREEN}{successful_tests}{Colors.NC}")
        print(f"Failed: {Colors.RED}{failed_tests}{Colors.NC}")
        print(f"Test files: {Colors.WHITE}{test_files}{Colors.NC}")
        print(f"Test functions: {Colors.WHITE}{test_functions}{Colors.NC}")

        # List generated reports
        print(f"\n{Colors.CYAN}📋 GENERATED REPORTS{Colors.NC}")
        print("-" * 30)

        reports = [
            ('Coverage Report', 'pesapal-complete-coverage/index.html'),
            ('HTML Test Report', 'pesapal-complete-report.html'),
            ('JUnit XML', 'pesapal-junit.xml'),
            ('Test Summary JSON', 'pesapal-test-summary.json')
        ]

        for report_name, report_file in reports:
            report_path = self.reports_path / report_file
            if report_path.exists():
                self.print_success(f"{report_name}: {report_path}")
            else:
                self.print_warning(f"{report_name}: Not generated")

        return successful_tests == total_tests

    def run_all_tests(self):
        """Run all Pesapal tests"""
        print(f"{Colors.PURPLE}🚀 Starting Pesapal Payment Tests...{Colors.NC}")
        print("=" * 60)

        # Test execution sequence
        test_sequence = [
            ('install_dependencies', "Installing dependencies"),
            ('run_utility_tests', "Utility tests"),
            ('run_route_tests', "Route tests"),
            ('run_complete_test_suite', "Complete test suite"),
            ('run_performance_tests', "Performance tests"),
            ('run_security_tests', "Security tests"),
            ('run_integration_tests', "Integration tests"),
            ('run_edge_case_tests', "Edge case tests"),
            ('run_data_validation_tests', "Data validation tests")
        ]

        all_passed = True

        for method_name, description in test_sequence:
            method = getattr(self, method_name)
            success = method()

            if not success:
                all_passed = False
                # Continue with other tests even if one fails

        # Generate summary report
        summary_success = self.generate_summary_report()

        print(f"\n{Colors.CYAN}🏁 TEST EXECUTION COMPLETE{Colors.NC}")
        print("=" * 40)

        if all_passed and summary_success:
            self.print_success("🎉 All Pesapal tests passed successfully!")
            return True
        else:
            self.print_error("❌ Some tests failed. Check the reports for details.")
            return False


def main():
    """Main execution function"""
    runner = PesapalTestRunner()

    try:
        success = runner.run_all_tests()
        sys.exit(0 if success else 1)

    except KeyboardInterrupt:
        runner.print_warning("Test execution interrupted by user")
        sys.exit(130)
    except Exception as e:
        runner.print_error(f"Unexpected error: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()
