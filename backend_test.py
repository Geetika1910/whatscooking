#!/usr/bin/env python3
"""
Comprehensive backend API testing for What's Cooking? app
Tests all CRUD operations, AI endpoints, and error handling
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, List

class WhatsCookingAPITester:
    def __init__(self, base_url="https://whats-cooking-spin.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = {}
        
        print(f"🧪 Testing What's Cooking API at: {base_url}")
        print("=" * 60)

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict = None, headers: Dict = None) -> tuple:
        """Run a single API test and return (success, response_data, status_code)"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=10)
            else:
                print(f"❌ Unsupported method: {method}")
                return False, {}, 0

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ PASS - Status: {response.status_code}")
                try:
                    response_data = response.json()
                except:
                    response_data = response.text
            else:
                print(f"❌ FAIL - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:500]
                })
                try:
                    response_data = response.json() if response.text else {}
                except:
                    response_data = response.text

            self.test_results[name] = {
                'success': success,
                'status_code': response.status_code,
                'data': response_data
            }
            
            return success, response_data, response.status_code

        except Exception as e:
            print(f"❌ FAIL - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            self.test_results[name] = {
                'success': False,
                'error': str(e)
            }
            return False, {}, 0

    def test_basic_endpoints(self):
        """Test basic API functionality"""
        print("\n📍 TESTING BASIC ENDPOINTS")
        
        # Test root endpoint
        self.run_test("API Root", "GET", "/", 200)
        
        return True

    def test_inventory_crud(self):
        """Test complete inventory CRUD operations"""
        print("\n📦 TESTING INVENTORY CRUD")
        
        # Get initial inventory
        success, inventory, status = self.run_test("Get Inventory", "GET", "/inventory", 200)
        if not success:
            return False
            
        initial_count = len(inventory) if isinstance(inventory, list) else 0
        print(f"   Initial inventory items: {initial_count}")
        
        # Add new item
        new_item = {
            "name": "Test Item",
            "cat": "Other",
            "qty": 100,
            "unit": "g",
            "threshold": 20,
            "expiry": "2026-12-31"
        }
        
        success, created_item, status = self.run_test(
            "Add Inventory Item", "POST", "/inventory", 200, new_item
        )
        
        if not success:
            return False
            
        test_item_id = created_item.get('id') if isinstance(created_item, dict) else None
        if not test_item_id:
            print("❌ FAIL - No item ID returned from create")
            return False
            
        print(f"   Created item ID: {test_item_id}")
        
        # Update item
        update_data = {
            "qty": 150,
            "name": "Updated Test Item"
        }
        
        self.run_test(
            "Update Inventory Item", "PUT", f"/inventory/{test_item_id}", 200, update_data
        )
        
        # Get updated inventory to verify
        success, updated_inventory, status = self.run_test("Get Updated Inventory", "GET", "/inventory", 200)
        if success and isinstance(updated_inventory, list):
            updated_item = next((item for item in updated_inventory if item.get('id') == test_item_id), None)
            if updated_item and updated_item.get('qty') == 150:
                print("✅ Item update verified")
            else:
                print("⚠️  WARNING - Item update not reflected")
        
        # Delete item
        self.run_test(
            "Delete Inventory Item", "DELETE", f"/inventory/{test_item_id}", 200
        )
        
        # Verify deletion
        success, final_inventory, status = self.run_test("Get Final Inventory", "GET", "/inventory", 200)
        if success and isinstance(final_inventory, list):
            deleted_item = next((item for item in final_inventory if item.get('id') == test_item_id), None)
            if not deleted_item:
                print("✅ Item deletion verified")
            else:
                print("⚠️  WARNING - Item not deleted")
                
        return True

    def test_preferences(self):
        """Test preferences endpoints"""
        print("\n⚙️  TESTING PREFERENCES")
        
        # Get preferences
        self.run_test("Get Preferences", "GET", "/preferences", 200)
        
        # Save preferences
        prefs_data = {
            "diet": "Vegetarian",
            "health_goal": "High protein", 
            "spice_level": "Medium"
        }
        
        self.run_test("Save Preferences", "POST", "/preferences", 200, prefs_data)
        
        # Verify saved preferences
        success, saved_prefs, status = self.run_test("Verify Saved Preferences", "GET", "/preferences", 200)
        if success and isinstance(saved_prefs, dict):
            if saved_prefs.get('diet') == 'Vegetarian' and saved_prefs.get('health_goal') == 'High protein':
                print("✅ Preferences save/load verified")
            else:
                print("⚠️  WARNING - Preferences not saved correctly")
        
        return True

    def test_ai_endpoints(self):
        """Test AI-powered endpoints (Claude integration)"""
        print("\n🤖 TESTING AI ENDPOINTS")
        
        # Test spin endpoint
        spin_data = {
            "time": "Under 20 min",
            "mood": "Comfort food",
            "ingredients": ["Rice", "Dal", "Onion", "Tomato"],
            "people": 4,
            "meal_time": "Lunch"
        }
        
        print("   Testing dish suggestion (may take a few seconds)...")
        success, spin_result, status = self.run_test("Spin Dish Suggestion", "POST", "/spin", 200, spin_data)
        
        if success and isinstance(spin_result, dict):
            dish_name = spin_result.get('dish', 'Unknown')
            print(f"   AI suggested: {dish_name}")
            
            # Test recipe endpoint with the suggested dish
            recipe_data = {
                "dish": dish_name,
                "people": 4
            }
            
            print("   Getting full recipe...")
            success, recipe_result, status = self.run_test("Get Full Recipe", "POST", "/recipe", 200, recipe_data)
            
            if success and isinstance(recipe_result, dict):
                ingredients = recipe_result.get('ingredients', [])
                steps = recipe_result.get('steps', [])
                print(f"   Recipe has {len(ingredients)} ingredients, {len(steps)} steps")
            
            # Test side dish
            side_data = {"dish": dish_name}
            self.run_test("Get Side Dish", "POST", "/side-dish", 200, side_data)
            
            # Test deduction estimate
            deduction_data = {
                "dish": dish_name,
                "people": 4
            }
            self.run_test("Get Deduction Estimate", "POST", "/deduction-estimate", 200, deduction_data)
        
        # Test meal suggestions
        meal_data = {
            "meal_type": "Breakfast",
            "diet": "Vegetarian",
            "health_goal": "No goal",
            "spice_level": "Medium",
            "available_ingredients": ["Rice", "Dal", "Flour", "Milk"]
        }
        
        print("   Testing meal suggestions...")
        success, meal_result, status = self.run_test("Get Meal Suggestions", "POST", "/meal-suggestions", 200, meal_data)
        
        if success and isinstance(meal_result, dict):
            suggestions = meal_result.get('suggestions', [])
            print(f"   AI suggested {len(suggestions)} breakfast items")
        
        return True

    def test_error_handling(self):
        """Test error cases and edge conditions"""
        print("\n🚫 TESTING ERROR HANDLING")
        
        # Test invalid inventory item
        invalid_item = {
            "name": "",  # Empty name
            "cat": "InvalidCategory",
            "qty": -10,  # Negative quantity
            "unit": "",
            "threshold": -5
        }
        
        self.run_test("Add Invalid Item", "POST", "/inventory", 422, invalid_item)  # Expecting validation error
        
        # Test non-existent item update
        self.run_test("Update Non-existent Item", "PUT", "/inventory/99999", 404, {"qty": 100})
        
        # Test non-existent item delete
        self.run_test("Delete Non-existent Item", "DELETE", "/inventory/99999", 404)
        
        # Test invalid spin request
        invalid_spin = {
            "time": "",
            "mood": "",
            "ingredients": [],
            "people": 0,
            "meal_time": ""
        }
        
        # This might still work due to fallbacks, so just test it returns something
        self.run_test("Invalid Spin Request", "POST", "/spin", 200, invalid_spin)
        
        return True

    def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Starting comprehensive API testing...")
        start_time = time.time()
        
        try:
            self.test_basic_endpoints()
            self.test_inventory_crud()
            self.test_preferences() 
            self.test_ai_endpoints()
            self.test_error_handling()
        except Exception as e:
            print(f"\n💥 Test suite interrupted: {str(e)}")
        
        end_time = time.time()
        duration = round(end_time - start_time, 2)
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        print(f"Duration: {duration}s")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['name']}")
                if 'expected' in test:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                    print(f"   Response: {test['response']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
        
        # Return exit code
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = WhatsCookingAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)