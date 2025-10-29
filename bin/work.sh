#!/bin/bash

start_work() {
    echo "  开始新的一天！"
    claude "今天是$(date +%Y年%m月%d日)，给我一个工作建议"

    echo -e "\n  项目状态："
    git status --short | claude "简述git工作区状态"

    echo -e "\n  待办事项："
    # 仅搜索.js文件，并排除node_modules目录
    find . -name "*.js" -not -path "*/node_modules/*" -exec grep -l "TODO" {} + | wc -l | xargs -I {} echo "发现 {} 个TODO"
}

end_work() {
    echo "  准备下班！"
    git diff --stat | claude "总结今天的工作成果"

    if [[ $(git status --porcelain) ]]; then
        echo -e "\n⚠️  有未提交的改动："
        git status --short
        read -p "是否需要提交？(y/n) " answer
        case "$answer" in
            [Yy]* )
                git commit -a
                ;;
            * )
                echo "未提交改动"
                ;;
        esac
    fi
}

case "$1" in
    start) start_work ;;
    end) end_work ;;
    *) echo "用法: $0 [start|end]" ;;
esac