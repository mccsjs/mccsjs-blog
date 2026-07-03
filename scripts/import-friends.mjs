import { PrismaClient } from '@prisma/client'
import yaml from 'yaml'
import fs from 'fs'

const prisma = new PrismaClient()

const ymlRaw = fs.readFileSync('D:/blog/source/_data/link.yml', 'utf-8')
const data = yaml.parse(ymlRaw)

async function main() {
  for (const group of data) {
    if (!group.class_name) continue

    // 创建或获取友链分组
    let friendType = await prisma.friendType.findFirst({
      where: { name: group.class_name },
    })

    if (!friendType) {
      friendType = await prisma.friendType.create({
        data: {
          name: group.class_name,
          sort: 10,
          isVisible: true,
        },
      })
      console.log(`创建分组: ${group.class_name}`)
    }

    const links = group.link_list || []
    for (const link of links) {
      if (!link.name || !link.link) continue

      // 检查是否已存在
      const existing = await prisma.friend.findFirst({
        where: { url: link.link },
      })
      if (existing) {
        console.log(`  跳过已存在: ${link.name} (${link.link})`)
        continue
      }

      // 自动生成截图 URL（如果没有）
      let screenshot = link.siteshot || ''
      if (!screenshot && link.link) {
        screenshot = `https://s0.wp.com/mshots/v1/${encodeURIComponent(link.link)}?w=400&h=300`
      }

      await prisma.friend.create({
        data: {
          name: link.name,
          url: link.link,
          description: link.descr || '',
          avatar: link.avatar || '',
          screenshot,
          sort: 5,
          isInvalid: group.class_name.includes('失联'),
          typeId: friendType.id,
        },
      })
      console.log(`  导入: ${link.name} (${link.link})`)
    }
  }

  console.log('\n导入完成！')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
