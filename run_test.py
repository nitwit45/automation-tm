#!/usr/bin/env python3
"""
Quick test script for DTM Bot
"""

from dtm_bot import DTMBot

# Test login with your credentials
bot = DTMBot()

if bot.login("nithila@payable.lk", "Aqua1483@2003"):
    print("✓ Login successful!")
    print(f"CSRF Token: {bot.csrf_token}")

    # Test getting data
    task_types = bot.get_task_types()
    print(f"Found {len(task_types)} task types")

    projects = bot.get_projects()
    print(f"Found {len(projects)} projects")

    print("Bot is ready!")
else:
    print("✗ Login failed")
